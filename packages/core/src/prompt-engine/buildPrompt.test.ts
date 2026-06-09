import { describe, expect, it } from 'vitest';
import { buildTextCompletionPrompt } from './buildPrompt';
import type { PowerUserSubset } from './types';
import type { StCharacter } from '../types/character';

// The user's real Gemma 4 instruct + context templates (from data/default-user/settings.json).
const power: PowerUserSubset = {
  instruct: {
    enabled: true,
    input_sequence: '<|turn>user\n',
    output_sequence: '<|turn>model\n',
    last_output_sequence: '',
    first_output_sequence: '',
    first_input_sequence: '',
    last_input_sequence: '',
    system_sequence: '<|turn>system\n',
    last_system_sequence: '',
    stop_sequence: '<turn|>',
    input_suffix: '<turn|>\n',
    output_suffix: '<turn|>\n',
    system_suffix: '<turn|>\n',
    wrap: false,
    macro: true,
    names_behavior: 'force',
    system_same_as_user: false,
    sequences_as_stop_strings: true,
    story_string_prefix: '<|turn>system\n',
    story_string_suffix: '<turn|>\n',
  },
  context: {
    story_string:
      '{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}',
    chat_start: '',
    example_separator: '',
    use_stop_strings: false,
    names_as_stop_strings: true,
    story_string_position: 0,
  },
  sysprompt: { enabled: true, content: 'SYS', post_history: '' },
  persona_description: '',
  persona_description_position: 0,
  prefer_character_prompt: false,
  collapse_newlines: false,
  single_line: false,
  custom_stopping_strings: '[]',
};

const seraphina: StCharacter = {
  name: 'Seraphina',
  description: 'D',
  personality: 'P',
  scenario: 'S',
  first_mes: 'F',
  mes_example: '',
  avatar: 'Seraphina.png',
};

describe('buildTextCompletionPrompt (Gemma instruct, KoboldCpp)', () => {
  it('produces the byte-exact SillyTavern prompt for a simple scene', async () => {
    const result = await buildTextCompletionPrompt({
      character: seraphina,
      power,
      identity: { user: 'Dennis', char: 'Seraphina' },
      history: [
        { name: 'Seraphina', mes: 'F', isUser: false },
        { name: 'Dennis', mes: 'Hello', isUser: true },
      ],
      maxContext: 100000,
      countTokens: () => 1,
      type: 'normal',
    });

    expect(result.prompt).toBe(
      '<|turn>system\nSYS\nD\nP\nS<turn|>\n' +
        '<|turn>model\nF<turn|>\n' +
        '<|turn>user\nHello<turn|>\n' +
        '<|turn>model\n',
    );
    expect(result.includedMessages).toBe(2);
  });

  it('substitutes {{char}} / {{user}} in the system prompt', async () => {
    const result = await buildTextCompletionPrompt({
      character: seraphina,
      power: { ...power, sysprompt: { enabled: true, content: 'Play {{char}} talking to {{user}}.' } },
      identity: { user: 'Dennis', char: 'Seraphina' },
      history: [{ name: 'Dennis', mes: 'Hi', isUser: true }],
      maxContext: 100000,
      countTokens: () => 1,
    });
    expect(result.prompt).toContain('Play Seraphina talking to Dennis.');
  });

  it('derives instruct + name stopping strings', async () => {
    const result = await buildTextCompletionPrompt({
      character: seraphina,
      power,
      identity: { user: 'Dennis', char: 'Seraphina' },
      history: [{ name: 'Dennis', mes: 'Hi', isUser: true }],
      maxContext: 100000,
      countTokens: () => 1,
    });
    expect(result.stoppingStrings).toContain('<turn|>');
    expect(result.stoppingStrings).toContain('<|turn>user');
    expect(result.stoppingStrings).toContain('\nDennis:');
  });

  it('trims oldest messages when the context budget is exceeded', async () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      name: i % 2 === 0 ? 'Seraphina' : 'Dennis',
      mes: `msg ${i}`,
      isUser: i % 2 !== 0,
    }));
    const result = await buildTextCompletionPrompt({
      character: seraphina,
      power,
      identity: { user: 'Dennis', char: 'Seraphina' },
      history: many,
      maxContext: 10, // tiny budget, each message counts as 1 token
      countTokens: () => 1,
    });
    // base (storyString + final line) already consumes part of the budget; only the newest few fit.
    expect(result.includedMessages).toBeLessThan(50);
    expect(result.includedMessages).toBeGreaterThan(0);
    // the most recent message must be present
    expect(result.prompt).toContain('msg 49');
  });
});
