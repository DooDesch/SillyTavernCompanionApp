import { describe, expect, it } from 'vitest';
import { buildTextCompletionPrompt } from './buildPrompt';
import type { PowerUserSubset } from './types';
import type { StCharacter } from '../types/character';

// Minimal non-instruct config so prompt assembly is easy to assert exactly.
const plainPower: PowerUserSubset = {
  instruct: {
    enabled: false,
    input_sequence: '',
    output_sequence: '',
    wrap: false,
    macro: false,
    names_behavior: 'none',
  },
  context: {
    story_string: '{{#if description}}{{description}}\n{{/if}}',
    chat_start: '',
    example_separator: '',
    use_stop_strings: false,
    story_string_position: 0,
  },
  sysprompt: { enabled: false, content: '' },
  persona_description: '',
  persona_description_position: 0,
  collapse_newlines: false,
};

const char: StCharacter = {
  name: 'Seraphina',
  description: 'D',
  personality: '',
  scenario: '',
  first_mes: 'F',
  mes_example: '',
  avatar: 'Seraphina.png',
};

const base = {
  identity: { user: 'Dennis', char: 'Seraphina' },
  maxContext: 100000,
  countTokens: () => 1,
  history: [{ name: 'Dennis', mes: 'Hey', isUser: true }],
};

describe('M2 parity - example dialogues', () => {
  it('injects mes_example between the story string and the chat history (non-instruct)', async () => {
    const result = await buildTextCompletionPrompt({
      ...base,
      character: { ...char, mes_example: '<START>\nDennis: Hi\nSeraphina: Hello.' },
      power: plainPower,
    });
    // Order: description, then the example block, then the user turn.
    expect(result.prompt).toContain('Dennis: Hi\nSeraphina: Hello.');
    const story = result.prompt.indexOf('D\n');
    const example = result.prompt.indexOf('Dennis: Hi');
    const turn = result.prompt.indexOf('Dennis: Hey');
    expect(story).toBeGreaterThanOrEqual(0);
    expect(example).toBeGreaterThan(story);
    expect(turn).toBeGreaterThan(example);
  });

  it('omits examples when strip_examples is set', async () => {
    const result = await buildTextCompletionPrompt({
      ...base,
      character: { ...char, mes_example: '<START>\nDennis: Hi\nSeraphina: Hello.' },
      power: { ...plainPower, strip_examples: true },
    });
    expect(result.prompt).not.toContain('Dennis: Hi');
  });
});

describe('M2 parity - @depth injection', () => {
  it('injects a World Info atDepth entry before the message at that depth', async () => {
    const result = await buildTextCompletionPrompt({
      ...base,
      character: char,
      power: plainPower,
      worldInfo: { before: '', after: '', depth: [{ depth: 1, role: 0, content: 'LORE@1' }] },
    });
    const lore = result.prompt.indexOf('LORE@1');
    const turn = result.prompt.indexOf('Dennis: Hey');
    expect(lore).toBeGreaterThanOrEqual(0);
    expect(lore).toBeLessThan(turn); // depth 1 = before the (only) last message
  });

  it('injects the character depth_prompt at its configured depth', async () => {
    const result = await buildTextCompletionPrompt({
      ...base,
      character: {
        ...char,
        data: { extensions: { depth_prompt: { prompt: 'DEPTHPROMPT', depth: 0, role: 'system' } } },
      } as StCharacter,
      power: plainPower,
    });
    const turn = result.prompt.indexOf('Dennis: Hey');
    const depth = result.prompt.indexOf('DEPTHPROMPT');
    expect(depth).toBeGreaterThan(turn); // depth 0 = after the last message (before the final line)
  });
});
