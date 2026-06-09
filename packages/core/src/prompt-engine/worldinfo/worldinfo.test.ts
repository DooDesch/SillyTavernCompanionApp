import { describe, expect, it } from 'vitest';
import { checkWorldInfo, emptyTimedState } from './activate';
import { matchKeys } from './matchKeys';
import {
  DEFAULT_WORLD_INFO_SETTINGS,
  WORLD_INFO_LOGIC,
  type WorldInfoEntry,
  type WorldInfoSettings,
} from './types';

const settings: WorldInfoSettings = { ...DEFAULT_WORLD_INFO_SETTINGS, depth: 5, budget: 50 };
const identity = { user: 'Dennis', char: 'Seraphina' };
const count = (t: string) => Math.ceil(t.length / 4);

function entry(over: Partial<WorldInfoEntry>): WorldInfoEntry {
  return { key: [], content: '', order: 100, position: 0, ...over };
}

describe('matchKeys', () => {
  it('matches whole words only', () => {
    const e = entry({});
    expect(matchKeys('the forest is dark', 'forest', e, settings)).toBe(true);
    expect(matchKeys('deforestation studies', 'forest', e, settings)).toBe(false);
  });

  it('matches /regex/ keys', () => {
    expect(matchKeys('a shadowfang appears', '/shadow\\w+/', entry({}), settings)).toBe(true);
  });

  it('is case-insensitive by default', () => {
    expect(matchKeys('Welcome to ELDORIA', 'eldoria', entry({}), settings)).toBe(true);
  });
});

describe('checkWorldInfo', () => {
  it('activates a keyword entry and substitutes macros (before position)', () => {
    const wi = checkWorldInfo({
      entries: [entry({ key: ['eldoria'], content: '{{char}} guards Eldoria for {{user}}.' })],
      chatMessages: ['Dennis: tell me about eldoria'],
      settings,
      maxContext: 8000,
      identity,
      countTokens: count,
    });
    expect(wi.before).toBe('Seraphina guards Eldoria for Dennis.');
    expect(wi.after).toBe('');
  });

  it('does not activate when no key matches', () => {
    const wi = checkWorldInfo({
      entries: [entry({ key: ['dragon'], content: 'X' })],
      chatMessages: ['hello world'],
      settings,
      maxContext: 8000,
      identity,
      countTokens: count,
    });
    expect(wi.before).toBe('');
  });

  it('keeps only one entry per inclusion group', () => {
    const wi = checkWorldInfo({
      entries: [
        entry({ key: ['x'], content: 'A', group: 'g', groupWeight: 100, order: 200 }),
        entry({ key: ['x'], content: 'B', group: 'g', groupWeight: 0, order: 100 }),
      ],
      chatMessages: ['x'],
      settings,
      maxContext: 8000,
      identity,
      countTokens: count,
      random: () => 0, // weighted pick lands on the first member
    });
    expect(wi.before).toBe('A');
  });

  it('groupOverride entries bypass the one-per-group limit', () => {
    const wi = checkWorldInfo({
      entries: [
        entry({ key: ['x'], content: 'A', group: 'g', order: 200 }),
        entry({ key: ['x'], content: 'B', group: 'g', groupOverride: true, order: 100 }),
      ],
      chatMessages: ['x'],
      settings,
      maxContext: 8000,
      identity,
      countTokens: count,
      random: () => 0,
    });
    expect(wi.before).toContain('A');
    expect(wi.before).toContain('B');
  });

  it('respects the delay timed effect (needs enough chat history)', () => {
    const base = {
      entries: [entry({ key: ['x'], content: 'LATE', delay: 3 })],
      settings,
      maxContext: 8000,
      identity,
      countTokens: count,
    };
    expect(checkWorldInfo({ ...base, chatMessages: ['x'] }).before).toBe('');
    expect(checkWorldInfo({ ...base, chatMessages: ['x', 'y', 'x'] }).before).toBe('LATE');
  });

  it('widens the scan to meet minActivations', () => {
    const wi = checkWorldInfo({
      entries: [
        entry({ key: ['recent'], content: 'R' }),
        entry({ key: ['old'], content: 'O' }),
      ],
      // "old" is outside the default depth-1 scan; min-activations widens until it is found.
      chatMessages: ['mentions old', 'a', 'b', 'c', 'mentions recent'],
      settings: { ...settings, depth: 1, minActivations: 2 },
      maxContext: 8000,
      identity,
      countTokens: count,
    });
    expect(wi.before).toContain('R');
    expect(wi.before).toContain('O');
  });

  it('sticky keeps an entry active after its keyword disappears', () => {
    const timed = emptyTimedState();
    const e = entry({ uid: 1, key: ['dragon'], content: 'DRAGON', sticky: 2 });
    const opts = { settings: { ...settings, depth: 1 }, maxContext: 8000, identity, countTokens: count, timedState: timed };
    expect(checkWorldInfo({ ...opts, entries: [e], chatMessages: ['a dragon!'] }).before).toBe('DRAGON');
    // Next turn: no keyword, but sticky still holds it active.
    expect(checkWorldInfo({ ...opts, entries: [e], chatMessages: ['a dragon!', 'calm now'] }).before).toBe('DRAGON');
  });

  it('cooldown blocks reactivation for N turns', () => {
    const timed = emptyTimedState();
    const e = entry({ uid: 2, key: ['x'], content: 'X', cooldown: 2 });
    const opts = { settings: { ...settings, depth: 1 }, maxContext: 8000, identity, countTokens: count, timedState: timed };
    expect(checkWorldInfo({ ...opts, entries: [e], chatMessages: ['x'] }).before).toBe('X');
    // Keyword present again, but the entry is on cooldown.
    expect(checkWorldInfo({ ...opts, entries: [e], chatMessages: ['x', 'x'] }).before).toBe('');
  });

  it('scans the persona description when matchPersonaDescription is set', () => {
    const wi = checkWorldInfo({
      entries: [entry({ key: ['knight'], content: 'KNIGHT', matchPersonaDescription: true })],
      chatMessages: ['hello'],
      settings: { ...settings, depth: 1 },
      maxContext: 8000,
      identity,
      countTokens: count,
      personaDescription: 'Dennis is a brave knight.',
    });
    expect(wi.before).toBe('KNIGHT');
  });

  it('always activates constant entries (after position)', () => {
    const wi = checkWorldInfo({
      entries: [entry({ constant: true, content: 'always here', position: 1 })],
      chatMessages: ['nothing relevant'],
      settings,
      maxContext: 8000,
      identity,
      countTokens: count,
    });
    expect(wi.after).toBe('always here');
  });

  it('applies AND_ALL selective logic on secondary keys', () => {
    const e = entry({
      key: ['forest'],
      keysecondary: ['dark', 'danger'],
      selective: true,
      selectiveLogic: WORLD_INFO_LOGIC.AND_ALL,
      content: 'C',
    });
    const yes = checkWorldInfo({
      entries: [e],
      chatMessages: ['the dark forest is full of danger'],
      settings,
      maxContext: 8000,
      identity,
      countTokens: count,
    });
    expect(yes.before).toBe('C');
    const no = checkWorldInfo({
      entries: [e],
      chatMessages: ['the dark forest'],
      settings,
      maxContext: 8000,
      identity,
      countTokens: count,
    });
    expect(no.before).toBe('');
  });

  it('enforces the token budget, dropping overflow after the highest-priority entry', () => {
    const a = entry({ constant: true, content: 'A'.repeat(40), order: 200 });
    const b = entry({ constant: true, content: 'B'.repeat(40), order: 100 });
    const wi = checkWorldInfo({
      entries: [a, b],
      chatMessages: ['x'],
      settings: { ...settings, budget: 5 },
      maxContext: 100,
      identity,
      countTokens: count,
    });
    expect(wi.before).toContain('A');
    expect(wi.before).not.toContain('B');
  });
});
