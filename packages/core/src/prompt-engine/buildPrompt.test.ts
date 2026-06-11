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

// Desktop persona_description_positions (personas.js:88-98):
// IN_PROMPT 0, AFTER_CHAR 1 (deprecated -> IN_PROMPT), TOP_AN 2, BOTTOM_AN 3, AT_DEPTH 4, NONE 9.
describe('persona description placement (text completion)', () => {
  const plainPower: PowerUserSubset = {
    instruct: { enabled: false, input_sequence: '', output_sequence: '', wrap: false, macro: false, names_behavior: 'none' },
    context: {
      story_string: '{{#if description}}{{description}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}',
      chat_start: '',
      example_separator: '',
      use_stop_strings: false,
      names_as_stop_strings: true,
      story_string_position: 0,
    },
    sysprompt: { enabled: false, content: '' },
    persona_description: 'PERSONA-DESC',
    collapse_newlines: false,
  };

  const build = (
    position: number,
    opts: { depth?: number; role?: number; authorsNote?: { depth: number; role: number; content: string } } = {},
  ) =>
    buildTextCompletionPrompt({
      character: seraphina,
      power: {
        ...plainPower,
        persona_description_position: position,
        ...(opts.depth !== undefined ? { persona_description_depth: opts.depth } : {}),
        ...(opts.role !== undefined ? { persona_description_role: opts.role } : {}),
      },
      identity: { user: 'Dennis', char: 'Seraphina' },
      history: [
        { name: 'Seraphina', mes: 'F', isUser: false },
        { name: 'Dennis', mes: 'Hello', isUser: true },
      ],
      maxContext: 100000,
      countTokens: () => 1,
      ...(opts.authorsNote ? { authorsNote: opts.authorsNote } : {}),
    });

  it('IN_PROMPT (0) renders into the story string', async () => {
    const result = await build(0);
    expect(result.prompt.startsWith('D\nPERSONA-DESC\n')).toBe(true);
  });

  it('deprecated AFTER_CHAR (1) behaves like IN_PROMPT', async () => {
    const result = await build(1);
    expect(result.prompt.startsWith('D\nPERSONA-DESC\n')).toBe(true);
  });

  it('AT_DEPTH (4) injects in-chat at the configured depth instead', async () => {
    const result = await build(4, { depth: 1, role: 0 });
    expect(result.prompt.startsWith('D\nPERSONA-DESC\n')).toBe(false);
    // depth 1 = before the last message
    const persona = result.prompt.indexOf('PERSONA-DESC');
    expect(persona).toBeGreaterThan(result.prompt.indexOf('Seraphina: F'));
    expect(persona).toBeLessThan(result.prompt.indexOf('Dennis: Hello'));
  });

  it('NONE (9) drops the persona entirely', async () => {
    const result = await build(9);
    expect(result.prompt).not.toContain('PERSONA-DESC');
  });

  it("TOP_AN (2) prepends the persona to the Author's Note injection", async () => {
    const result = await build(2, { authorsNote: { depth: 0, role: 0, content: 'NOTE' } });
    expect(result.prompt).toContain('PERSONA-DESC\nNOTE');
    expect(result.prompt.startsWith('D\nPERSONA-DESC')).toBe(false);
  });

  it("BOTTOM_AN (3) appends the persona to the Author's Note injection", async () => {
    const result = await build(3, { authorsNote: { depth: 0, role: 0, content: 'NOTE' } });
    expect(result.prompt).toContain('NOTE\nPERSONA-DESC');
  });

  it('TOP_AN without a note still injects the persona in-chat at the note defaults (depth 4)', async () => {
    const history = Array.from({ length: 6 }, (_, i) => ({
      name: i % 2 ? 'Dennis' : 'Seraphina',
      mes: `m${i}`,
      isUser: i % 2 === 1,
    }));
    const result = await buildTextCompletionPrompt({
      character: seraphina,
      power: { ...plainPower, persona_description_position: 2 },
      identity: { user: 'Dennis', char: 'Seraphina' },
      history,
      maxContext: 100000,
      countTokens: () => 1,
    });
    const persona = result.prompt.indexOf('PERSONA-DESC');
    // depth 4 of 6 messages: between m1 and m2.
    expect(persona).toBeGreaterThan(result.prompt.indexOf('m1'));
    expect(persona).toBeLessThan(result.prompt.indexOf('m2'));
  });
});

describe('impersonate stopping strings (kai-settings.js:197 / script.js:2977-2979)', () => {
  it('pushes the char name first when impersonating', async () => {
    const result = await buildTextCompletionPrompt({
      character: seraphina,
      power,
      identity: { user: 'Dennis', char: 'Seraphina' },
      history: [{ name: 'Dennis', mes: 'Hi', isUser: true }],
      maxContext: 100000,
      countTokens: () => 1,
      isImpersonate: true,
    });
    expect(result.stoppingStrings[0]).toBe('\nSeraphina:');
    expect(result.stoppingStrings).toContain('\nDennis:');
  });
});
