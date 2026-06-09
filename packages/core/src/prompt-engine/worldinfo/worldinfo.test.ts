import { describe, expect, it } from 'vitest';
import { checkWorldInfo } from './activate';
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
