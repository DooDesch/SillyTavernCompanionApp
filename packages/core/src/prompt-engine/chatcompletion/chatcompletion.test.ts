import { describe, expect, it } from 'vitest';
import { parseChatCompletionData } from './stream';
import { buildChatCompletionMessages } from './buildMessages';
import { getChatCompletionModel } from './model';
import { DEFAULT_PROMPT_ORDER, type OaiSettings } from './types';
import type { CharacterCardFields } from '../characterFields';

describe('parseChatCompletionData', () => {
  it('parses OpenAI delta.content', () => {
    expect(parseChatCompletionData('{"choices":[{"delta":{"content":"hi"}}]}', 'openai')).toEqual({
      text: 'hi',
      reasoning: undefined,
      done: false,
    });
  });

  it('parses Claude delta.text + thinking', () => {
    expect(
      parseChatCompletionData('{"type":"content_block_delta","delta":{"text":"yo","thinking":"hmm"}}', 'claude'),
    ).toEqual({ text: 'yo', reasoning: 'hmm', done: false });
  });

  it('parses Gemini candidates parts (skips thought parts)', () => {
    const d = '{"candidates":[{"content":{"parts":[{"thought":true,"text":"reason"},{"text":"answer"}]}}]}';
    expect(parseChatCompletionData(d, 'makersuite')).toEqual({ text: 'answer', reasoning: 'reason', done: false });
  });

  it('parses DeepSeek reasoning_content', () => {
    expect(
      parseChatCompletionData('{"choices":[{"delta":{"content":"x","reasoning_content":"r"}}]}', 'deepseek'),
    ).toMatchObject({ text: 'x', reasoning: 'r' });
  });

  it('recognizes [DONE]', () => {
    expect(parseChatCompletionData('[DONE]', 'openai')).toEqual({ text: '', done: true });
  });
});

describe('getChatCompletionModel', () => {
  it('maps source to the right model field', () => {
    expect(getChatCompletionModel({ chat_completion_source: 'claude', claude_model: 'claude-x' })).toBe('claude-x');
    expect(getChatCompletionModel({ chat_completion_source: 'makersuite', google_model: 'gemini-y' })).toBe('gemini-y');
    expect(getChatCompletionModel({ chat_completion_source: 'deepseek', deepseek_model: 'ds' })).toBe('ds');
  });
});

describe('buildChatCompletionMessages', () => {
  const fields: CharacterCardFields = {
    description: 'A guardian.',
    personality: 'Kind',
    scenario: 'A forest.',
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
    scenario_format: 'Scenario: {{scenario}}',
    personality_format: "{{char}}'s personality: {{personality}}",
    prompts: [
      { identifier: 'main', content: 'You are {{char}}.' },
      { identifier: 'nsfw', content: '' },
      { identifier: 'jailbreak', content: 'Stay in character.' },
    ],
    prompt_order: [{ character_id: 100000, order: DEFAULT_PROMPT_ORDER }],
  };

  it('builds messages in the default prompt order with substituted macros', async () => {
    const messages = await buildChatCompletionMessages({
      oai,
      fields,
      identity: { user: 'Dennis', char: 'Seraphina' },
      history: [
        { name: 'Seraphina', mes: 'Hello', isUser: false },
        { name: 'Dennis', mes: 'Hi', isUser: true },
      ],
      maxContext: 8192,
      maxTokens: 512,
      countTokens: (t) => Math.ceil(t.length / 4),
    });

    expect(messages).toEqual([
      { role: 'system', content: 'You are Seraphina.' },
      { role: 'system', content: 'A guardian.' },
      { role: 'system', content: "Seraphina's personality: Kind" },
      { role: 'system', content: 'Scenario: A forest.' },
      { role: 'assistant', content: 'Hello' },
      { role: 'user', content: 'Hi' },
      { role: 'system', content: 'Stay in character.' },
    ]);
  });

  it('squashes consecutive system messages when enabled', async () => {
    const messages = await buildChatCompletionMessages({
      oai: { ...oai, squash_system_messages: true },
      fields,
      identity: { user: 'Dennis', char: 'Seraphina' },
      history: [{ name: 'Dennis', mes: 'Hi', isUser: true }],
      maxContext: 8192,
      maxTokens: 512,
      countTokens: (t) => Math.ceil(t.length / 4),
    });
    // The 4 leading system prompts squash into one; then the user message; then jailbreak system.
    expect(messages[0]).toEqual({
      role: 'system',
      content: "You are Seraphina.\nA guardian.\nSeraphina's personality: Kind\nScenario: A forest.",
    });
    expect(messages[1]).toEqual({ role: 'user', content: 'Hi' });
    expect(messages[2]).toEqual({ role: 'system', content: 'Stay in character.' });
  });
});
