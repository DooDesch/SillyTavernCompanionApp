import { describe, expect, it } from 'vitest';
import { buildTextCompletionPrompt, type BuildPromptInput } from './buildPrompt';
import { buildChatCompletionMessages } from './chatcompletion/buildMessages';
import { createChatCompletionBody } from './chatcompletion/body';
import { DEFAULT_PROMPT_ORDER, type OaiSettings } from './chatcompletion/types';
import type { CharacterCardFields } from './characterFields';
import type { PowerUserSubset } from './types';
import type { StCharacter } from '../types/character';

// Same Gemma-style instruct fixture as buildPrompt.test.ts.
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
    story_string: '{{#if system}}{{system}}\n{{/if}}{{trim}}',
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
  description: '',
  personality: '',
  scenario: '',
  first_mes: 'F',
  mes_example: '',
  avatar: 'Seraphina.png',
};

const baseInput = (over: Partial<BuildPromptInput> = {}): BuildPromptInput => ({
  character: seraphina,
  power,
  identity: { user: 'Dennis', char: 'Seraphina' },
  history: [
    { name: 'Seraphina', mes: 'F', isUser: false },
    { name: 'Dennis', mes: 'Hello', isUser: true },
    { name: 'Seraphina', mes: 'Partial reply', isUser: false },
  ],
  maxContext: 100000,
  countTokens: () => 1,
  type: 'continue',
  ...over,
});

describe('buildTextCompletionPrompt type=continue', () => {
  it('ends the prompt exactly with the suffix-free partial reply (instruct)', async () => {
    const result = await buildTextCompletionPrompt(baseInput());
    expect(result.prompt).toBe(
      '<|turn>system\nSYS<turn|>\n' +
        '<|turn>model\nF<turn|>\n' +
        '<|turn>user\nHello<turn|>\n' +
        '<|turn>model\nPartial reply',
    );
    expect(result.includedMessages).toBe(3);
  });

  it('never ends on a stopping string (the model must keep writing)', async () => {
    const result = await buildTextCompletionPrompt(baseInput());
    for (const s of result.stoppingStrings) {
      expect(result.prompt.endsWith(s)).toBe(false);
    }
  });

  it('opens the continued reply with last_output_sequence when configured', async () => {
    const result = await buildTextCompletionPrompt(
      baseInput({
        power: { ...power, instruct: { ...power.instruct, last_output_sequence: '<|turn>gm\n' } },
      }),
    );
    expect(result.prompt.endsWith('<|turn>gm\nPartial reply')).toBe(true);
  });

  it('places depth-0 injections BEFORE the partial reply', async () => {
    const result = await buildTextCompletionPrompt(
      baseInput({ authorsNote: { depth: 0, role: 0, content: 'NOTE' } }),
    );
    expect(result.prompt.indexOf('NOTE')).toBeGreaterThan(-1);
    expect(result.prompt.indexOf('NOTE')).toBeLessThan(result.prompt.indexOf('Partial reply'));
    expect(result.prompt.endsWith('Partial reply')).toBe(true);
  });

  it('continues a non-instruct prompt without the trailing newline', async () => {
    const result = await buildTextCompletionPrompt(
      baseInput({ power: { ...power, instruct: { ...power.instruct, enabled: false } } }),
    );
    expect(result.prompt.endsWith('Seraphina: Partial reply')).toBe(true);
  });

  it('keeps a lone greeting in place (no cycle shift) and still strips the suffix', async () => {
    const result = await buildTextCompletionPrompt(
      baseInput({ history: [{ name: 'Seraphina', mes: 'F', isUser: false }] }),
    );
    expect(result.prompt.endsWith('F')).toBe(true);
    expect(result.includedMessages).toBe(1);
  });

  it('always sends the partial reply, even when it alone busts the budget', async () => {
    const result = await buildTextCompletionPrompt(
      baseInput({
        history: [
          { name: 'Seraphina', mes: 'F', isUser: false },
          { name: 'Dennis', mes: 'Hello', isUser: true },
          { name: 'Seraphina', mes: 'A very long partial reply', isUser: false },
        ],
        maxContext: 1, // everything busts the budget
      }),
    );
    expect(result.prompt.endsWith('A very long partial reply')).toBe(true);
  });

  it('does not change the normal prompt (regression guard)', async () => {
    const result = await buildTextCompletionPrompt(baseInput({ type: 'normal' }));
    expect(result.prompt).toBe(
      '<|turn>system\nSYS<turn|>\n' +
        '<|turn>model\nF<turn|>\n' +
        '<|turn>user\nHello<turn|>\n' +
        '<|turn>model\nPartial reply<turn|>\n' +
        '<|turn>model\n',
    );
  });
});

describe('buildChatCompletionMessages type=continue', () => {
  const fields: CharacterCardFields = {
    description: 'A guardian.',
    personality: '',
    scenario: '',
    persona: '',
    system: '',
    jailbreak: '',
    mesExamples: '',
    charDepthPrompt: '',
    firstMessage: '',
  };
  const oai: OaiSettings = {
    chat_completion_source: 'openai',
    openai_max_context: 8192,
    openai_max_tokens: 512,
    prompts: [{ identifier: 'main', content: 'You are {{char}}.' }],
    prompt_order: [{ character_id: 100000, order: DEFAULT_PROMPT_ORDER }],
  };
  const history = [
    { name: 'Seraphina', mes: 'Hello', isUser: false },
    { name: 'Dennis', mes: 'Hi', isUser: true },
    { name: 'Seraphina', mes: 'Partial reply', isUser: false },
  ];
  const identity = { user: 'Dennis', char: 'Seraphina' };

  it('moves the partial reply to the end followed by the continue nudge (default)', async () => {
    const messages = await buildChatCompletionMessages({
      oai,
      fields,
      identity,
      history,
      maxContext: 8192,
      maxTokens: 512,
      countTokens: () => 1,
      type: 'continue',
    });
    const last = messages[messages.length - 1]!;
    const secondLast = messages[messages.length - 2]!;
    expect(secondLast).toMatchObject({ role: 'assistant', content: 'Partial reply' });
    expect(last.role).toBe('system');
    expect(last.content).toBe('[Continue your last message without repeating its original content.]');
    // The partial reply appears exactly once.
    expect(messages.filter((m) => m.content === 'Partial reply')).toHaveLength(1);
  });

  it('substitutes {{lastChatMessage}} in a custom nudge', async () => {
    const messages = await buildChatCompletionMessages({
      oai: { ...oai, continue_nudge_prompt: 'Continue: {{lastChatMessage}}' },
      fields,
      identity,
      history,
      maxContext: 8192,
      maxTokens: 512,
      countTokens: () => 1,
      type: 'continue',
    });
    expect(messages[messages.length - 1]!.content).toBe('Continue: Partial reply');
  });

  it('uses assistant prefill for Claude when continue_prefill is on', async () => {
    const messages = await buildChatCompletionMessages({
      oai: {
        ...oai,
        chat_completion_source: 'claude',
        continue_prefill: true,
        assistant_prefill: 'PREFILL',
      },
      fields,
      identity,
      history,
      maxContext: 8192,
      maxTokens: 512,
      countTokens: () => 1,
      type: 'continue',
    });
    const last = messages[messages.length - 1]!;
    expect(last.role).toBe('assistant');
    expect(last.content).toBe('PREFILL\n\nPartial reply');
  });

  it('keeps $-patterns in the partial inert in the nudge', async () => {
    const messages = await buildChatCompletionMessages({
      oai: { ...oai, continue_nudge_prompt: 'X {{lastChatMessage}} Y' },
      fields,
      identity,
      history: [
        { name: 'Dennis', mes: 'Hi', isUser: true },
        { name: 'Seraphina', mes: "costs $'bout fifty", isUser: false },
      ],
      maxContext: 8192,
      maxTokens: 512,
      countTokens: () => 1,
      type: 'continue',
    });
    expect(messages[messages.length - 1]!.content).toBe("X costs $'bout fifty Y");
  });

  it('skips displacement and nudge entirely for an empty partial (ST cyclePrompt guard)', async () => {
    const messages = await buildChatCompletionMessages({
      oai,
      fields,
      identity,
      history: [
        { name: 'Dennis', mes: 'Hi', isUser: true },
        { name: 'Seraphina', mes: '', isUser: false },
      ],
      maxContext: 8192,
      maxTokens: 512,
      countTokens: () => 1,
      type: 'continue',
    });
    const last = messages[messages.length - 1]!;
    expect(last).toMatchObject({ role: 'assistant', content: '' });
    expect(messages.some((m) => typeof m.content === 'string' && m.content.includes('Continue your last'))).toBe(false);
  });

  it('prefill flavor displaces BEFORE injections (depth >= 1 keeps its desktop slot)', async () => {
    // history [A, B, C_partial] + X@1 -> ST: [A, X, B, ..., C] (shift before inject)
    const messages = await buildChatCompletionMessages({
      oai: { ...oai, chat_completion_source: 'claude', continue_prefill: true },
      fields,
      identity,
      history: [
        { name: 'Seraphina', mes: 'A', isUser: false },
        { name: 'Dennis', mes: 'B', isUser: true },
        { name: 'Seraphina', mes: 'C', isUser: false },
      ],
      depthInjections: [{ depth: 1, role: 0, content: 'X' }],
      maxContext: 8192,
      maxTokens: 512,
      countTokens: () => 1,
      type: 'continue',
    });
    const order = ['A', 'X', 'B', 'C'].map((c) => messages.findIndex((m) => m.content === c));
    expect(order.every((idx) => idx >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(messages[messages.length - 1]!.content).toBe('C');
  });

  it('suppresses the body assistant_prefill when continue-prefilling (ST parity)', () => {
    const claude: OaiSettings = {
      ...oai,
      chat_completion_source: 'claude',
      continue_prefill: true,
      assistant_prefill: 'PREFILL',
    };
    const opts = { stream: true, identity } as const;
    const onContinue = createChatCompletionBody(claude, [], { ...opts, type: 'continue' });
    expect(onContinue.assistant_prefill).toBeUndefined();
    const onNormal = createChatCompletionBody(claude, [], { ...opts, type: 'normal' });
    expect(onNormal.assistant_prefill).toBe('PREFILL');
    // Nudge flavor (continue_prefill off) keeps the body prefill on continue.
    const nudgeFlavor = createChatCompletionBody(
      { ...claude, continue_prefill: false },
      [],
      { ...opts, type: 'continue' },
    );
    expect(nudgeFlavor.assistant_prefill).toBe('PREFILL');
  });

  it('keeps depth injections before the displaced partial reply', async () => {
    const messages = await buildChatCompletionMessages({
      oai,
      fields,
      identity,
      history,
      depthInjections: [{ depth: 0, role: 0, content: 'NOTE' }],
      maxContext: 8192,
      maxTokens: 512,
      countTokens: () => 1,
      type: 'continue',
    });
    const noteIdx = messages.findIndex((m) => m.content === 'NOTE');
    const partialIdx = messages.findIndex((m) => m.content === 'Partial reply');
    expect(noteIdx).toBeGreaterThan(-1);
    expect(noteIdx).toBeLessThan(partialIdx);
  });

  it('leaves normal requests untouched (regression guard)', async () => {
    const messages = await buildChatCompletionMessages({
      oai,
      fields,
      identity,
      history,
      maxContext: 8192,
      maxTokens: 512,
      countTokens: () => 1,
    });
    const last = messages[messages.length - 1]!;
    expect(last).toMatchObject({ role: 'assistant', content: 'Partial reply' });
    expect(messages.some((m) => typeof m.content === 'string' && m.content.includes('Continue your last message'))).toBe(
      false,
    );
  });
});
