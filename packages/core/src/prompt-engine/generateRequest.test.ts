import { describe, expect, it } from 'vitest';
import {
  buildChatCompletionGenerateRequest,
  buildKoboldGenerateRequest,
  buildTextgenGenerateRequest,
  type ChatCompletionGenerateParams,
} from './generate';
import { computeKaiFlags } from './kobold';
import { DEFAULT_PROMPT_ORDER, type OaiSettings } from './chatcompletion/types';
import type { PowerUserSubset } from './types';
import type { StCharacter } from '../types/character';

// Plain non-instruct config so prompt assembly stays trivially countable.
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
    names_as_stop_strings: true,
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

const identity = { user: 'Dennis', char: 'Seraphina' };

// 10 alternating lines, 1000 "tokens" each (countTokens => 1000).
const history = Array.from({ length: 10 }, (_, i) => ({
  name: i % 2 ? 'Seraphina' : 'Dennis',
  mes: `m${i}`,
  isUser: i % 2 === 0,
}));

describe('prompt budget vs body context (desktop getMaxPromptTokens split)', () => {
  it('kobold: body max_context_length keeps the FULL context while the prompt obeys the budget', async () => {
    // budget 4000: base 1000 + 2 lines (3000) fit, a third (4000) busts it -> 2 messages.
    const req = await buildKoboldGenerateRequest({
      character: char,
      power: plainPower,
      kai: { preset_settings: 'gui' },
      identity,
      history,
      maxContext: 4000,
      bodyMaxContext: 4096,
      maxTokens: 96,
      countTokens: () => 1000,
      flags: computeKaiFlags(undefined, undefined),
      apiServer: 'http://localhost:5001/api',
    });
    expect(req.body['max_context_length']).toBe(4096);
    expect(req.body['max_length']).toBe(96);
    expect(req.includedMessages).toBe(2);
  });

  it('kobold: bodyMaxContext defaults to the prompt budget when not provided', async () => {
    const req = await buildKoboldGenerateRequest({
      character: char,
      power: plainPower,
      kai: { preset_settings: 'gui' },
      identity,
      history,
      maxContext: 4000,
      maxTokens: 96,
      countTokens: () => 1000,
      flags: computeKaiFlags(undefined, undefined),
      apiServer: 'http://localhost:5001/api',
    });
    expect(req.body['max_context_length']).toBe(4000);
  });

  it('textgen: body truncation_length keeps the FULL context while the prompt obeys the budget', async () => {
    const req = await buildTextgenGenerateRequest({
      character: char,
      power: plainPower,
      textgen: { type: 'koboldcpp', server_urls: { koboldcpp: 'http://localhost:5001' } },
      identity,
      history,
      maxContext: 4000,
      bodyMaxContext: 4096,
      maxTokens: 96,
      countTokens: () => 1000,
      stream: false,
    });
    expect(req.body['truncation_length']).toBe(4096);
    expect(req.includedMessages).toBe(2);
  });
});

describe('persona description placement (chat completion)', () => {
  const oai: OaiSettings = {
    chat_completion_source: 'openai',
    openai_max_context: 8192,
    openai_max_tokens: 512,
    prompts: [{ identifier: 'main', content: 'MAIN' }],
    prompt_order: [{ character_id: 100000, order: DEFAULT_PROMPT_ORDER }],
  };

  const build = (position: number, over: Partial<ChatCompletionGenerateParams> = {}) =>
    buildChatCompletionGenerateRequest({
      character: char,
      power: {
        ...plainPower,
        persona_description: 'PERSONA-DESC',
        persona_description_position: position,
        persona_description_depth: 1,
        persona_description_role: 0,
      },
      oai,
      identity,
      history: [
        { name: 'Seraphina', mes: 'F', isUser: false },
        { name: 'Dennis', mes: 'Hello', isUser: true },
      ],
      maxContext: 8192,
      maxTokens: 512,
      countTokens: () => 1,
      stream: false,
      ...over,
    });

  it('IN_PROMPT (0) fills the personaDescription prompt slot (openai.js:1424)', async () => {
    const req = await build(0);
    expect(req.messages.some((m) => m.content === 'PERSONA-DESC')).toBe(true);
  });

  it('AT_DEPTH (4) injects in-chat instead of the prompt slot', async () => {
    const req = await build(4);
    const idx = req.messages.findIndex((m) => m.content === 'PERSONA-DESC');
    expect(idx).toBeGreaterThan(-1);
    // depth 1 = between the two chat messages, well after the MAIN prompt
    expect(idx).toBeGreaterThan(req.messages.findIndex((m) => m.content === 'F'));
    expect(idx).toBeLessThan(req.messages.findIndex((m) => m.content === 'Hello'));
  });

  it('NONE (9) drops the persona entirely', async () => {
    const req = await build(9);
    expect(req.messages.some((m) => String(m.content).includes('PERSONA-DESC'))).toBe(false);
  });

  it("TOP_AN (2) rides the Author's Note injection", async () => {
    const req = await build(2, { authorsNote: { depth: 0, role: 0, content: 'NOTE' } });
    expect(req.messages.some((m) => m.content === 'PERSONA-DESC\nNOTE')).toBe(true);
  });
});
