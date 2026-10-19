import { describe, expect, it } from 'vitest';
import { historyFromMessages, resolveGreetingMacros } from './generate';
import { isExternalMediaAllowed } from './settings';
import type { PowerUserSubset } from './types';
import type { StCharacter } from '../types/character';
import type { StChatMessage } from '../types/chat';

const power = {
  instruct: {},
  context: {},
  sysprompt: {},
  persona_description: '',
} as unknown as PowerUserSubset;

const char: StCharacter = {
  name: 'Aspen',
  description: 'A shy girl.',
  personality: '',
  scenario: '',
  first_mes: '',
  mes_example: '',
  avatar: 'Aspen.png',
};

const identity = { user: 'D', char: 'Aspen' };

function bot(mes: string, extra: Partial<StChatMessage> = {}): StChatMessage {
  return { name: 'Aspen', is_user: false, is_system: false, send_date: '', mes, ...extra } as StChatMessage;
}

describe('resolveGreetingMacros (ST messageFormatting, message 0)', () => {
  it('resolves {{char}} and {{user}} in the active greeting swipe', () => {
    const greeting = bot('{{char}} waves.', {
      swipes: ['{{char}} waves.', '{{char}} looks at {{user}}.', 'Third'],
      swipe_id: 1,
    });
    const [first] = resolveGreetingMacros([greeting], char, power, identity);
    expect(first!.mes).toBe('Aspen looks at D.');
    expect(first!.swipes).toEqual(['{{char}} waves.', 'Aspen looks at D.', 'Third']);
  });

  it('resolves card macros like {{description}}', () => {
    const [first] = resolveGreetingMacros([bot('{{description}}')], char, power, identity);
    expect(first!.mes).toBe('A shy girl.');
  });

  it('leaves later messages, user greetings and macro-free text untouched', () => {
    const later = bot('{{user}} stays raw.');
    const plain = [bot('Hi.'), later];
    expect(resolveGreetingMacros(plain, char, power, identity)).toBe(plain);
    const userFirst = [{ ...bot('{{char}}'), is_user: true }];
    expect(resolveGreetingMacros(userFirst, char, power, identity)).toBe(userFirst);
    const resolved = resolveGreetingMacros([bot('{{char}}'), later], char, power, identity);
    expect(resolved[1]).toBe(later);
  });

  it('feeds the resolved greeting into the prompt history', () => {
    const hist = historyFromMessages(resolveGreetingMacros([bot('Hi {{user}}')], char, power, identity), 'Aspen');
    expect(hist[0]!.mes).toBe('Hi D');
  });
});

describe('isExternalMediaAllowed (ST chats.js)', () => {
  it('forbids external media by default', () => {
    expect(isExternalMediaAllowed(power, 'Aspen.png')).toBe(false);
  });

  it('follows the global switch and the per-character overrides', () => {
    const allowAll = { ...power, forbid_external_media: false } as PowerUserSubset;
    expect(isExternalMediaAllowed(allowAll, 'Aspen.png')).toBe(true);
    expect(
      isExternalMediaAllowed({ ...allowAll, external_media_forbidden_overrides: ['Aspen.png'] }, 'Aspen.png'),
    ).toBe(false);
    expect(
      isExternalMediaAllowed({ ...power, external_media_allowed_overrides: ['Aspen.png'] }, 'Aspen.png'),
    ).toBe(true);
  });
});
