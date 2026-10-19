import { describe, expect, it } from 'vitest';
import { buildTextgenGenerateRequest } from './generate';
import type { PowerUserSubset } from './types';
import type { StCharacter } from '../types/character';

function power(alwaysForceName2: boolean, instruct = false): PowerUserSubset {
  return {
    instruct: {
      enabled: instruct,
      input_sequence: '<|user|>',
      output_sequence: '<|assistant|>',
      wrap: true,
      macro: false,
      names_behavior: 'none',
    },
    context: {
      story_string: '',
      chat_start: '',
      example_separator: '',
      use_stop_strings: false,
      names_as_stop_strings: true,
      story_string_position: 0,
    },
    sysprompt: { enabled: false, content: '' },
    always_force_name2: alwaysForceName2,
  } as PowerUserSubset;
}

const char: StCharacter = {
  name: 'Seraphina',
  description: '',
  personality: '',
  scenario: '',
  first_mes: '',
  mes_example: '',
  avatar: 'Seraphina.png',
};

const history = [
  { name: 'Seraphina', mes: 'Welcome.', isUser: false },
  { name: 'Tester', mes: 'Where am I?', isUser: true },
];

async function prompt(p: PowerUserSubset, extra: { isImpersonate?: boolean; type?: 'continue' } = {}) {
  const req = await buildTextgenGenerateRequest({
    character: char,
    power: p,
    textgen: { type: 'ollama' },
    identity: { user: 'Tester', char: 'Seraphina' },
    history,
    maxContext: 4096,
    maxTokens: 100,
    countTokens: (t: string) => Math.ceil(t.length / 4),
    stream: false,
    ...extra,
  });
  return req.prompt;
}

describe('textgen prompt line (ST modifyLastPromptLine)', () => {
  it('appends the character name when always_force_name2 is on', async () => {
    expect(await prompt(power(true))).toMatch(/Tester: Where am I\?\nSeraphina:$/);
  });

  it('appends nothing when always_force_name2 is off', async () => {
    expect(await prompt(power(false))).toMatch(/Tester: Where am I\?\n?$/);
  });

  it('appends the user name when impersonating', async () => {
    expect(await prompt(power(true), { isImpersonate: true })).toMatch(/\nTester:$/);
  });

  it('leaves instruct mode to the output sequence', async () => {
    const p = await prompt(power(true, true));
    expect(p.endsWith('Seraphina:')).toBe(false);
    expect(p).toContain('<|assistant|>');
  });
});
