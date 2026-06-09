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
  /** Persona description - scanned for entries with matchPersonaDescription. */
  personaDescription?: string;
  /** Character description - scanned for entries with matchCharacterDescription. */
  characterDescription?: string;
  /**
   * Timed-effect state (sticky/cooldown), persisted per chat in `chat_metadata.timedWorldInfo`.
   * MUTATED IN PLACE: the caller passes its stored state in, then persists it back after generation.
   */
  timedState?: TimedWorldInfoState;
}

/** Per-chat timed-effect bookkeeping: uid → chat-message index until which the effect holds. */
export interface TimedWorldInfoState {
  /** Entry stays force-active while the current index <= this value. */
  sticky: Record<string, number>;
  /** Entry cannot (re)activate while the current index < this value. */
  cooldown: Record<string, number>;
}

export function emptyTimedState(): TimedWorldInfoState {
  return { sticky: {}, cooldown: {} };
}

function secondaryActivated(entry: WorldInfoEntry, scan: string, settings: WorldInfoSettings): boolean {
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

/** Pick a single winner among inclusion-group members (weighted by groupWeight; scoring → highest order). */
function pickGroupWinner(members: WorldInfoEntry[], random: () => number): WorldInfoEntry {
  if (members.length === 1) return members[0]!;
  if (members.some((m) => m.useGroupScoring)) {
    return [...members].sort((a, b) => (b.order ?? 100) - (a.order ?? 100))[0]!;
  }
  const total = members.reduce((s, m) => s + (m.groupWeight ?? 100), 0);
  let r = random() * total;
  for (const m of members) {
    r -= m.groupWeight ?? 100;
    if (r <= 0) return m;
  }
  return members[members.length - 1]!;
}

/** Keep at most one entry per non-empty inclusion group (groupOverride entries bypass the limit). */
function filterByInclusionGroups(entries: WorldInfoEntry[], random: () => number): WorldInfoEntry[] {
  const winners: WorldInfoEntry[] = [];
  const groups = new Map<string, WorldInfoEntry[]>();
  for (const e of entries) {
    if (e.group && e.group.trim() && !e.groupOverride) {
      const arr = groups.get(e.group) ?? [];
      arr.push(e);
      groups.set(e.group, arr);
    } else {
      winners.push(e);
    }
  }
  for (const members of groups.values()) winners.push(pickGroupWinner(members, random));
  return winners;
}

/**
 * Faithful-but-scoped port of SillyTavern's `checkWorldInfo`. Supports: constant + selective key
 * activation (primary/secondary logic), probability, bounded recursion, inclusion groups + scoring,
 * min-activations widening, per-entry scanDepth, persona/character-description scan sources, the
 * `delay` timed effect, a token budget, and position grouping (before/after/atDepth).
 * Stateful timed effects (sticky/cooldown) need per-chat persistence and are intentionally omitted.
 */
export function checkWorldInfo(params: CheckWorldInfoParams): WorldInfoActivation {
  const { entries, settings, maxContext, identity, countTokens, chatMessages } = params;
  const random = params.random ?? Math.random;
  const persona = params.personaDescription ?? '';
  const charDesc = params.characterDescription ?? '';
  const messageCount = chatMessages.length;
  const globalDepth = Math.max(1, settings.depth);

  const candidates = entries.filter((e) => !e.disable && (e.content ?? '').length > 0);
  const idOf = (e: WorldInfoEntry, i: number) => String(e.uid ?? `i${i}`);

  const scanForEntry = (entry: WorldInfoEntry, depth: number, extraText = ''): string => {
    let scan = chatMessages.slice(-Math.max(1, depth)).join('\n');
    if (entry.matchPersonaDescription && persona) scan += '\n' + persona;
    if (entry.matchCharacterDescription && charDesc) scan += '\n' + charDesc;
    if (extraText) scan += '\n' + extraText;
    return scan;
  };

  const matchEntry = (entry: WorldInfoEntry, scan: string): boolean => {
    if (entry.delay && entry.delay > 0 && messageCount < entry.delay) return false;
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

  // Timed effects (sticky/cooldown). State is mutated in place so the caller can persist it.
  const timed = params.timedState;
  const isSticky = (id: string): boolean => !!timed && timed.sticky[id] !== undefined && messageCount <= timed.sticky[id]!;
  const isCoolingDown = (id: string): boolean =>
    !!timed && timed.cooldown[id] !== undefined && messageCount < timed.cooldown[id]!;
  const scheduleTimed = (entry: WorldInfoEntry, id: string): void => {
    if (!timed) return;
    if (entry.sticky && entry.sticky > 0) {
      timed.sticky[id] = messageCount + entry.sticky;
      if (entry.cooldown && entry.cooldown > 0) timed.cooldown[id] = messageCount + entry.sticky + entry.cooldown;
    } else if (entry.cooldown && entry.cooldown > 0) {
      timed.cooldown[id] = messageCount + 1 + entry.cooldown;
    }
  };

  const active = new Map<string, WorldInfoEntry>();
  const activatePass = (depth: number, extraText = ''): boolean => {
    let added = false;
    candidates.forEach((entry, i) => {
      const id = idOf(entry, i);
      if (active.has(id)) return;
      if (entry.excludeRecursion && extraText) return;
      // Sticky wins (force-active even without a key match); cooldown blocks (re)activation.
      if (timed) {
        if (isSticky(id)) {
          active.set(id, entry);
          added = true;
          return;
        }
        if (isCoolingDown(id)) return;
      }
      const scan = scanForEntry(entry, entry.scanDepth ?? depth, extraText);
      if (matchEntry(entry, scan)) {
        active.set(id, entry);
        added = true;
        scheduleTimed(entry, id);
      }
    });
    return added;
  };

  activatePass(globalDepth);

  // Bounded recursion: activated content can trigger further entries.
  if (settings.recursive && settings.maxRecursionSteps > 0) {
    let step = 0;
    let added = true;
    while (added && step < settings.maxRecursionSteps) {
      step += 1;
      const recurseText = [...active.values()]
        .filter((e) => !e.preventRecursion)
        .map((e) => e.content)
        .join('\n');
      added = activatePass(globalDepth, recurseText);
    }
  }

  // Minimum activations: widen the scan depth until the floor is met (or we run out of history).
  const minAct = settings.minActivations ?? 0;
  if (minAct > 0 && active.size < minAct) {
    const maxDepth = settings.maxActivationDepth && settings.maxActivationDepth > 0 ? settings.maxActivationDepth : messageCount;
    let depth = globalDepth;
    while (active.size < minAct && depth < maxDepth) {
      depth += 1;
      activatePass(depth);
    }
  }

  const grouped = filterByInclusionGroups([...active.values()], random);

  const budget =
    settings.budgetCap > 0
      ? Math.min(settings.budgetCap, Math.round((settings.budget * maxContext) / 100))
      : Math.round((settings.budget * maxContext) / 100);

  // Higher `order` = higher priority; gets budget first.
  const ordered = grouped.sort((a, b) => (b.order ?? 100) - (a.order ?? 100));

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
