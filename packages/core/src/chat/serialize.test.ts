import { describe, expect, it } from 'vitest';
import {
  chatFromArray,
  chatToArray,
  parseChatJsonl,
  stringifyChatJsonl,
} from './serialize';
import type { StChat } from '../types/chat';

const header = {
  user_name: 'Dennis',
  character_name: 'Seraphina',
  create_date: '2026-06-08 @12h00m00s',
  chat_metadata: { integrity: 'abc123' },
};
const msg1 = { name: 'Seraphina', is_user: false, send_date: 1, mes: 'Hello *smiles*' };
const msg2 = { name: 'Dennis', is_user: true, send_date: 2, mes: 'Hi there' };

describe('chat serialize', () => {
  it('splits the wire array into header + messages', () => {
    const chat = chatFromArray([header, msg1, msg2]);
    expect(chat.header.character_name).toBe('Seraphina');
    expect(chat.messages).toHaveLength(2);
    expect(chat.messages[0]?.mes).toBe('Hello *smiles*');
  });

  it('throws on an empty array', () => {
    expect(() => chatFromArray([])).toThrow(/empty chat array/);
  });

  it('round-trips array <-> split', () => {
    const arr = [header, msg1, msg2];
    expect(chatToArray(chatFromArray(arr))).toEqual(arr);
  });

  it('round-trips JSONL <-> split and preserves the integrity slug', () => {
    const chat: StChat = { header, messages: [msg1, msg2] };
    const jsonl = stringifyChatJsonl(chat);
    expect(jsonl.split('\n')).toHaveLength(3);
    const parsed = parseChatJsonl(jsonl);
    expect(parsed.header.chat_metadata.integrity).toBe('abc123');
    expect(parsed.messages).toEqual([msg1, msg2]);
  });

  it('ignores blank lines when parsing JSONL', () => {
    const jsonl = `${JSON.stringify(header)}\n\n${JSON.stringify(msg1)}\n`;
    const parsed = parseChatJsonl(jsonl);
    expect(parsed.messages).toHaveLength(1);
  });
});
