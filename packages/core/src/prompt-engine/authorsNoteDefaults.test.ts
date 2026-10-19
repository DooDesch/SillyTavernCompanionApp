import { describe, expect, it } from 'vitest';
import {
  AN_DEFAULTS,
  extractAuthorsNoteDefaults,
  extractEngineConfig,
  resolveAuthorsNote,
  shouldInjectAuthorsNote,
} from './settings';

const settings = {
  extension_settings: {
    note: { default: '[Antworte auf Deutsch.]', defaultDepth: 2, defaultInterval: 3, defaultRole: 1, defaultPosition: 1 },
  },
};

describe('extractAuthorsNoteDefaults', () => {
  it('reads extension_settings.note', () => {
    expect(extractAuthorsNoteDefaults(settings)).toEqual({
      content: '[Antworte auf Deutsch.]',
      depth: 2,
      interval: 3,
      role: 1,
    });
  });

  it('falls back to the desktop defaults when the note settings are missing', () => {
    expect(extractAuthorsNoteDefaults({})).toEqual(AN_DEFAULTS);
  });

  it('is part of the engine config', () => {
    expect(extractEngineConfig(settings, 'Seraphina').noteDefaults?.content).toBe('[Antworte auf Deutsch.]');
  });
});

describe('resolveAuthorsNote', () => {
  const defaults = extractAuthorsNoteDefaults(settings);

  it('uses the default note for a chat without note metadata', () => {
    expect(resolveAuthorsNote({}, defaults)).toEqual(defaults);
    expect(resolveAuthorsNote(undefined, defaults)).toEqual(defaults);
  });

  it('keeps the values the chat sets, including an empty note', () => {
    expect(resolveAuthorsNote({ note_prompt: '', note_depth: 6 }, defaults)).toEqual({
      content: '',
      depth: 6,
      interval: 3,
      role: 1,
    });
  });

  it('uses the desktop defaults without ST note settings', () => {
    expect(resolveAuthorsNote({ note_prompt: 'x' }, undefined)).toEqual({ ...AN_DEFAULTS, content: 'x' });
  });
});

describe('shouldInjectAuthorsNote', () => {
  it('always injects with interval 1, even before the first user message', () => {
    expect(shouldInjectAuthorsNote(1, 0)).toBe(true);
    expect(shouldInjectAuthorsNote(1, 5)).toBe(true);
  });

  it('never injects with interval 0', () => {
    expect(shouldInjectAuthorsNote(0, 4)).toBe(false);
  });

  it('injects on every Nth user message', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((n) => shouldInjectAuthorsNote(3, n))).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
      true,
    ]);
  });
});
