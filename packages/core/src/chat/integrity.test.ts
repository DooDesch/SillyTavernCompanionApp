import { describe, expect, it } from 'vitest';
import { getIntegritySlug, isIntegrityConflict } from './integrity';
import type { StChat } from '../types/chat';

const chat: StChat = {
  header: {
    user_name: 'Dennis',
    character_name: 'Seraphina',
    create_date: 'x',
    chat_metadata: { integrity: 'slug-1' },
  },
  messages: [],
};

describe('integrity', () => {
  it('reads the integrity slug from the header', () => {
    expect(getIntegritySlug(chat)).toBe('slug-1');
    expect(getIntegritySlug({ ...chat, header: { ...chat.header, chat_metadata: {} } })).toBeUndefined();
  });

  it('detects a 400 integrity conflict', () => {
    expect(isIntegrityConflict(400, { error: 'integrity' })).toBe(true);
  });

  it('ignores other responses', () => {
    expect(isIntegrityConflict(200, { ok: true })).toBe(false);
    expect(isIntegrityConflict(400, { error: 'other' })).toBe(false);
    expect(isIntegrityConflict(400, null)).toBe(false);
    expect(isIntegrityConflict(500, { error: 'integrity' })).toBe(false);
  });
});
