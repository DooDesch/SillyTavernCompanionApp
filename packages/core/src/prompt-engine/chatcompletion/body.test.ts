import { describe, expect, it } from 'vitest';
import {
  calculateLogitBias,
  createChatCompletionBody,
  getOaiCustomStoppingStrings,
  type ChatCompletionBodyOptions,
} from './body';
import { buildChatCompletionMessages } from './buildMessages';
import { DEFAULT_PROMPT_ORDER, type ChatCompletionMessage, type OaiSettings } from './types';
import { buildChatCompletionGenerateRequest } from '../generate';
import type { CharacterCardFields } from '../characterFields';
import type { Identity, PowerUserSubset } from '../types';
import type { StCharacter } from '../../types/character';

const identity: Identity = { user: 'Dennis', char: 'Seraphina' };
const messages: ChatCompletionMessage[] = [{ role: 'user', content: 'Hi' }];

const base: OaiSettings = {
  chat_completion_source: 'openai',
  openai_model: 'gpt-4o',
  temp_openai: 0.9,
  freq_pen_openai: 0.1,
  pres_pen_openai: 0.2,
  top_p_openai: 0.95,
  top_k_openai: 40,
  min_p_openai: 0.05,
  top_a_openai: 0.15,
  repetition_penalty_openai: 1.1,
  openai_max_tokens: 300,
  show_thoughts: true,
  reasoning_effort: 'medium',
  seed: -1,
  n: 1,
};

const opts: ChatCompletionBodyOptions = { stream: true, identity };

/** The base generate_data fields shared by every source (openai.js:2742-2767). */
const commonBody = {
  messages,
  temperature: 0.9,
  frequency_penalty: 0.1,
  presence_penalty: 0.2,
  top_p: 0.95,
  max_tokens: 300,
  stream: true,
  user_name: 'Dennis',
  char_name: 'Seraphina',
  group_names: [],
  include_reasoning: true,
  enable_web_search: false,
  request_images: false,
  request_image_resolution: '',
  request_image_aspect_ratio: '',
  custom_prompt_post_processing: '',
};

describe('createChatCompletionBody golden bodies per source', () => {
  it('openai', () => {
    expect(createChatCompletionBody(base, messages, opts)).toEqual({
      ...commonBody,
      model: 'gpt-4o',
      chat_completion_source: 'openai',
      reasoning_effort: 'medium',
    });
  });

  it('claude (top_k, use_sysprompt, uncapped stop, prefill, raw reasoning_effort)', () => {
    const oai: OaiSettings = {
      ...base,
      chat_completion_source: 'claude',
      claude_model: 'claude-sonnet-4-20250514',
      use_sysprompt: true,
      assistant_prefill: 'Sure, {{user}}:',
    };
    expect(createChatCompletionBody(oai, messages, opts)).toEqual({
      ...commonBody,
      model: 'claude-sonnet-4-20250514',
      chat_completion_source: 'claude',
      // claude is not a reasoningEffortSources member: the value passes through untouched
      reasoning_effort: 'medium',
      top_k: 40,
      use_sysprompt: true,
      stop: [], // desktop re-assigns getCustomStoppingStrings() AFTER the empty-stop deletion
      assistant_prefill: 'Sure, Dennis:',
    });
  });

  it('openrouter (extra samplers + routing fields)', () => {
    const oai: OaiSettings = {
      ...base,
      chat_completion_source: 'openrouter',
      openrouter_model: 'anthropic/claude-3.5-sonnet',
      openrouter_use_fallback: false,
      openrouter_providers: ['DeepInfra'],
      openrouter_quantizations: ['fp8'],
      openrouter_allow_fallbacks: true,
      openrouter_middleout: 'on',
    };
    expect(createChatCompletionBody(oai, messages, opts)).toEqual({
      ...commonBody,
      model: 'anthropic/claude-3.5-sonnet',
      chat_completion_source: 'openrouter',
      reasoning_effort: 'medium',
      top_k: 40,
      min_p: 0.05,
      repetition_penalty: 1.1,
      top_a: 0.15,
      use_fallback: false,
      provider: ['DeepInfra'],
      quantizations: ['fp8'],
      allow_fallbacks: true,
      middleout: 'on',
    });
  });

  it('makersuite (top_k, use_sysprompt, filtered stop)', () => {
    const oai: OaiSettings = {
      ...base,
      chat_completion_source: 'makersuite',
      google_model: 'gemini-2.0-flash',
      use_sysprompt: true,
    };
    expect(createChatCompletionBody(oai, messages, opts)).toEqual({
      ...commonBody,
      model: 'gemini-2.0-flash',
      chat_completion_source: 'makersuite',
      reasoning_effort: 'medium',
      top_k: 40,
      stop: [],
      use_sysprompt: true,
    });
  });

  it('custom (url + include/exclude/headers)', () => {
    const oai: OaiSettings = {
      ...base,
      chat_completion_source: 'custom',
      custom_model: 'llama-3.1-8b',
      custom_url: 'http://localhost:1234/v1',
      custom_include_body: 'a: 1',
      custom_exclude_body: 'b',
      custom_include_headers: 'X-Test: 1',
    };
    expect(createChatCompletionBody(oai, messages, opts)).toEqual({
      ...commonBody,
      model: 'llama-3.1-8b',
      chat_completion_source: 'custom',
      reasoning_effort: 'medium',
      custom_url: 'http://localhost:1234/v1',
      custom_include_body: 'a: 1',
      custom_exclude_body: 'b',
      custom_include_headers: 'X-Test: 1',
    });
  });

  it('deepseek (top_p fallback to epsilon + reasoning effort mapping)', () => {
    const oai: OaiSettings = {
      ...base,
      chat_completion_source: 'deepseek',
      deepseek_model: 'deepseek-reasoner',
    };
    expect(createChatCompletionBody(oai, messages, opts)).toEqual({
      ...commonBody,
      model: 'deepseek-reasoner',
      chat_completion_source: 'deepseek',
      // deepseek maps any non-auto/non-max effort to 'high' (openai.js:2548-2557)
      reasoning_effort: 'high',
    });
    const zeroTopP = createChatCompletionBody({ ...oai, top_p_openai: 0 }, messages, opts);
    expect(zeroTopP.top_p).toBe(Number.EPSILON);
  });

  it('azure_openai (azure fields + gpt-4 reasoning_effort deletion)', () => {
    const oai: OaiSettings = {
      ...base,
      chat_completion_source: 'azure_openai',
      azure_openai_model: 'gpt-4o',
      azure_base_url: 'https://example.openai.azure.com',
      azure_deployment_name: 'gpt4o-deploy',
      azure_api_version: '2024-06-01',
    };
    expect(createChatCompletionBody(oai, messages, opts)).toEqual({
      ...commonBody,
      model: 'gpt-4o',
      chat_completion_source: 'azure_openai',
      azure_base_url: 'https://example.openai.azure.com',
      azure_deployment_name: 'gpt4o-deploy',
      azure_api_version: '2024-06-01',
      // no reasoning_effort: deleted for gpt-3.x/4.x models (openai.js:2773-2776)
    });
  });

  it('cohere clamps top_p and the penalties', () => {
    const oai: OaiSettings = {
      ...base,
      chat_completion_source: 'cohere',
      cohere_model: 'command-r',
      top_p_openai: 1,
      freq_pen_openai: -0.5,
      pres_pen_openai: 1.6,
    };
    const body = createChatCompletionBody(oai, messages, opts);
    expect(body.top_p).toBe(0.99);
    expect(body.frequency_penalty).toBe(0);
    expect(body.presence_penalty).toBe(1);
    expect(body.top_k).toBe(40);
  });

  it('groq drops logprobs/logit_bias/n', () => {
    const oai: OaiSettings = { ...base, chat_completion_source: 'groq', groq_model: 'llama-3.3-70b', n: 3 };
    const body = createChatCompletionBody(oai, messages, {
      ...opts,
      logitBias: { '1': 5 },
      requestTokenProbabilities: true,
    });
    expect(body.logprobs).toBeUndefined();
    expect(body.logit_bias).toBeUndefined();
    expect(body.n).toBeUndefined();
  });

  it('xai model nuances (grok-3-mini vs grok-4)', () => {
    const mini = createChatCompletionBody(
      { ...base, chat_completion_source: 'xai', xai_model: 'grok-3-mini' },
      messages,
      { ...opts, customStoppingStrings: ['stop'] },
    );
    expect(mini.reasoning_effort).toBe('medium');
    expect(mini.presence_penalty).toBeUndefined();
    expect(mini.frequency_penalty).toBeUndefined();
    expect(mini.stop).toBeUndefined();

    const grok4 = createChatCompletionBody(
      { ...base, chat_completion_source: 'xai', xai_model: 'grok-4' },
      messages,
      { ...opts, customStoppingStrings: ['stop'] },
    );
    expect(grok4.reasoning_effort).toBeUndefined();
    expect(grok4.presence_penalty).toBeUndefined();
    expect(grok4.frequency_penalty).toBeUndefined();
    expect(grok4.stop).toBeUndefined();
  });

  it('zai/perplexity/mistralai stop handling', () => {
    const stops = ['a', 'b', 'c'];
    const zai = createChatCompletionBody(
      { ...base, chat_completion_source: 'zai', zai_model: 'glm-4.6' },
      messages,
      { ...opts, customStoppingStrings: stops },
    );
    expect(zai.stop).toEqual(['a']);
    expect(zai.zai_endpoint).toBe('common');
    expect(zai.presence_penalty).toBeUndefined();
    expect(zai.frequency_penalty).toBeUndefined();

    const pplx = createChatCompletionBody(
      { ...base, chat_completion_source: 'perplexity', perplexity_model: 'sonar' },
      messages,
      { ...opts, customStoppingStrings: stops },
    );
    expect(pplx.stop).toBeUndefined();

    const mistral = createChatCompletionBody(
      { ...base, chat_completion_source: 'mistralai', mistralai_model: 'mistral-large' },
      messages,
      { ...opts, customStoppingStrings: stops },
    );
    expect(mistral.stop).toEqual(['a', 'b', 'c']);
    expect(mistral.safe_prompt).toBe(false);
  });
});

describe('stop strings cap (openai_max_stop_strings)', () => {
  const six = ['a', 'b', 'c', 'd', 'e', 'f'];

  it('caps the base stop list at 4', () => {
    const body = createChatCompletionBody(base, messages, { ...opts, customStoppingStrings: six });
    expect(body.stop).toEqual(['a', 'b', 'c', 'd']);
  });

  it('claude gets the uncapped list', () => {
    const body = createChatCompletionBody(
      { ...base, chat_completion_source: 'claude', claude_model: 'claude-3' },
      messages,
      { ...opts, customStoppingStrings: six },
    );
    expect(body.stop).toEqual(six);
  });

  it('makersuite caps at 5 and filters by length 1..16', () => {
    const body = createChatCompletionBody(
      { ...base, chat_completion_source: 'makersuite', google_model: 'gemini-2.0-flash' },
      messages,
      { ...opts, customStoppingStrings: ['this-stop-string-is-too-long', 'a', 'b', 'c', 'd', 'e'] },
    );
    expect(body.stop).toEqual(['a', 'b', 'c', 'd']); // 5 sliced, the >16-char one filtered out
  });

  it('omits the stop field entirely when there are no custom stopping strings', () => {
    const body = createChatCompletionBody(base, messages, opts);
    expect('stop' in body).toBe(false);
  });
});

describe('reverse proxy gating', () => {
  const proxied: Partial<OaiSettings> = { reverse_proxy: 'http://127.0.0.1:5000/proxy', proxy_password: 'pw' };

  it('forwards the proxy for supported sources (claude)', () => {
    const body = createChatCompletionBody(
      { ...base, ...proxied, chat_completion_source: 'claude', claude_model: 'claude-3' },
      messages,
      opts,
    );
    expect(body.reverse_proxy).toBe('http://127.0.0.1:5000/proxy');
    expect(body.proxy_password).toBe('pw');
  });

  it('drops the proxy for unsupported sources (groq, custom)', () => {
    for (const source of ['groq', 'custom']) {
      const body = createChatCompletionBody(
        { ...base, ...proxied, chat_completion_source: source },
        messages,
        opts,
      );
      expect(body.reverse_proxy).toBeUndefined();
      expect(body.proxy_password).toBeUndefined();
    }
  });
});

describe('seed and n gating', () => {
  it('sends the seed only for seed-supporting sources', () => {
    const openai = createChatCompletionBody({ ...base, seed: 42 }, messages, opts);
    expect(openai.seed).toBe(42);
    const claude = createChatCompletionBody(
      { ...base, chat_completion_source: 'claude', claude_model: 'c', seed: 42 },
      messages,
      opts,
    );
    expect(claude.seed).toBeUndefined();
  });

  it('omits a negative seed', () => {
    expect(createChatCompletionBody({ ...base, seed: -1 }, messages, opts).seed).toBeUndefined();
  });

  it('sends n only for multi-swipe sources', () => {
    expect(createChatCompletionBody({ ...base, n: 3 }, messages, opts).n).toBe(3);
    const claude = createChatCompletionBody(
      { ...base, chat_completion_source: 'claude', claude_model: 'c', n: 3 },
      messages,
      opts,
    );
    expect(claude.n).toBeUndefined();
  });

  it('never multi-swipes on quiet/impersonate/continue', () => {
    for (const type of ['quiet', 'impersonate', 'continue'] as const) {
      const body = createChatCompletionBody({ ...base, n: 3 }, messages, { ...opts, type });
      expect(body.n).toBeUndefined();
    }
    expect(createChatCompletionBody({ ...base, n: 3 }, messages, { ...opts, type: 'swipe' }).n).toBe(3);
  });

  it('omits n when it is 1', () => {
    expect(createChatCompletionBody({ ...base, n: 1 }, messages, opts).n).toBeUndefined();
  });
});

describe('type / stream flags', () => {
  it('sends the generation type except for plain sends', () => {
    expect(createChatCompletionBody(base, messages, opts).type).toBeUndefined();
    expect(createChatCompletionBody(base, messages, { ...opts, type: 'quiet' }).type).toBe('quiet');
    expect(createChatCompletionBody(base, messages, { ...opts, type: 'impersonate' }).type).toBe('impersonate');
  });

  it('never streams quiet generations', () => {
    expect(createChatCompletionBody(base, messages, { ...opts, type: 'quiet' }).stream).toBe(false);
  });

  it('never streams o1 (the model cannot)', () => {
    const body = createChatCompletionBody({ ...base, openai_model: 'o1' }, messages, opts);
    expect(body.stream).toBe(false);
  });
});

describe('logprobs and vision-model deletions', () => {
  it('requests logprobs=5 when enabled and the source supports it', () => {
    const body = createChatCompletionBody(base, messages, { ...opts, requestTokenProbabilities: true });
    expect(body.logprobs).toBe(5);
    const claude = createChatCompletionBody(
      { ...base, chat_completion_source: 'claude', claude_model: 'c' },
      messages,
      { ...opts, requestTokenProbabilities: true },
    );
    expect(claude.logprobs).toBeUndefined();
  });

  it('drops logit_bias/stop/logprobs for gpt vision models', () => {
    const body = createChatCompletionBody({ ...base, openai_model: 'gpt-4-vision-preview' }, messages, {
      ...opts,
      customStoppingStrings: ['x'],
      logitBias: { '42': 10 },
      requestTokenProbabilities: true,
    });
    expect(body.logit_bias).toBeUndefined();
    expect(body.stop).toBeUndefined();
    expect(body.logprobs).toBeUndefined();
  });

  it('drops logprobs for gpt-4.5', () => {
    const body = createChatCompletionBody({ ...base, openai_model: 'gpt-4.5-preview' }, messages, {
      ...opts,
      requestTokenProbabilities: true,
    });
    expect(body.logprobs).toBeUndefined();
    expect(body.logit_bias).toBeUndefined(); // none was provided
  });
});

describe('o-series and gpt-5 model nuances', () => {
  it('o1: max_completion_tokens, no samplers, system roles become user', () => {
    const sys: ChatCompletionMessage[] = [
      { role: 'system', content: 'S' },
      { role: 'user', content: 'U' },
    ];
    const body = createChatCompletionBody({ ...base, openai_model: 'o1', n: 3 }, sys, {
      ...opts,
      customStoppingStrings: ['x'],
      logitBias: { '1': 1 },
    });
    expect(body.max_completion_tokens).toBe(300);
    expect(body.max_tokens).toBeUndefined();
    expect(body.temperature).toBeUndefined();
    expect(body.top_p).toBeUndefined();
    expect(body.frequency_penalty).toBeUndefined();
    expect(body.presence_penalty).toBeUndefined();
    expect(body.stop).toBeUndefined();
    expect(body.logit_bias).toBeUndefined();
    expect(body.n).toBeUndefined();
    expect(body.messages).toEqual([
      { role: 'user', content: 'S' },
      { role: 'user', content: 'U' },
    ]);
  });

  it('gpt-5: max_completion_tokens and sampler removal', () => {
    const body = createChatCompletionBody({ ...base, openai_model: 'gpt-5' }, messages, {
      ...opts,
      customStoppingStrings: ['x'],
    });
    expect(body.max_completion_tokens).toBe(300);
    expect(body.max_tokens).toBeUndefined();
    expect(body.temperature).toBeUndefined();
    expect(body.top_p).toBeUndefined();
    expect(body.stop).toBeUndefined();
  });
});

describe('reasoning effort and verbosity mapping', () => {
  it("'auto' is omitted for mapped sources but passes through otherwise", () => {
    expect(createChatCompletionBody({ ...base, reasoning_effort: 'auto' }, messages, opts).reasoning_effort).toBeUndefined();
    const claude = createChatCompletionBody(
      { ...base, chat_completion_source: 'claude', claude_model: 'c', reasoning_effort: 'auto' },
      messages,
      opts,
    );
    expect(claude.reasoning_effort).toBe('auto');
  });

  it("'min'/'max' map per source", () => {
    expect(createChatCompletionBody({ ...base, reasoning_effort: 'max' }, messages, opts).reasoning_effort).toBe('high');
    expect(createChatCompletionBody({ ...base, reasoning_effort: 'min' }, messages, opts).reasoning_effort).toBe('low');
    const orMin = createChatCompletionBody(
      {
        ...base,
        chat_completion_source: 'openrouter',
        openrouter_model: 'openai/gpt-4o',
        reasoning_effort: 'min',
        show_thoughts: false,
      },
      messages,
      opts,
    );
    expect(orMin.reasoning_effort).toBe('none');
  });

  it('verbosity is sent unless auto', () => {
    expect(createChatCompletionBody({ ...base, verbosity: 'high' }, messages, opts).verbosity).toBe('high');
    expect(createChatCompletionBody({ ...base, verbosity: 'auto' }, messages, opts).verbosity).toBeUndefined();
  });

  it('web search and image request fields pass through', () => {
    const body = createChatCompletionBody(
      {
        ...base,
        enable_web_search: true,
        request_images: true,
        request_image_resolution: '1k',
        request_image_aspect_ratio: '16:9',
      },
      messages,
      opts,
    );
    expect(body.enable_web_search).toBe(true);
    expect(body.request_images).toBe(true);
    expect(body.request_image_resolution).toBe('1k');
    expect(body.request_image_aspect_ratio).toBe('16:9');
  });
});

describe('claude impersonation prefill', () => {
  it('uses assistant_impersonation instead of assistant_prefill on impersonate', () => {
    const oai: OaiSettings = {
      ...base,
      chat_completion_source: 'claude',
      claude_model: 'c',
      assistant_prefill: 'PREFILL',
      assistant_impersonation: 'I am {{user}}.',
    };
    const body = createChatCompletionBody(oai, messages, { ...opts, type: 'impersonate' });
    expect(body.assistant_prefill).toBe('I am Dennis.');
    expect(createChatCompletionBody(oai, messages, opts).assistant_prefill).toBe('PREFILL');
  });
});

describe('calculateLogitBias', () => {
  const preset: OaiSettings = {
    chat_completion_source: 'openai',
    openai_model: 'gpt-4o',
    bias_preset_selected: 'mine',
    bias_presets: {
      mine: [
        { text: 'Hello', value: 10 },
        { text: '[5, 6]', value: -5 },
        { text: '', value: 99 },
      ],
    },
  };
  const encode = async (text: string): Promise<number[]> => (text === 'Hello' ? [1, 2] : [9]);

  it('maps encoded tokens and raw token-id arrays to the entry value', async () => {
    expect(await calculateLogitBias(preset, encode)).toEqual({ '1': 10, '2': 10, '5': -5, '6': -5 });
  });

  it('returns undefined for unsupported sources', async () => {
    expect(
      await calculateLogitBias({ ...preset, chat_completion_source: 'claude' }, encode),
    ).toBeUndefined();
  });

  it('returns undefined without a selected, non-empty preset', async () => {
    expect(await calculateLogitBias({ ...preset, bias_preset_selected: '' }, encode)).toBeUndefined();
    expect(
      await calculateLogitBias({ ...preset, bias_presets: { mine: [] } }, encode),
    ).toBeUndefined();
  });

  it('skips entries the encoder cannot handle', async () => {
    const failing = async (text: string): Promise<number[]> => {
      if (text === 'Hello') throw new Error('boom');
      return [7];
    };
    expect(
      await calculateLogitBias(
        { ...preset, bias_presets: { mine: [{ text: 'Hello', value: 1 }, { text: 'ok', value: 2 }] } },
        failing,
      ),
    ).toEqual({ '7': 2 });
  });
});

describe('getOaiCustomStoppingStrings', () => {
  it('parses and macro-substitutes the JSON list', () => {
    expect(
      getOaiCustomStoppingStrings({ custom_stopping_strings: '["{{user}}:", "###"]' }, identity),
    ).toEqual(['Dennis:', '###']);
  });

  it('honours custom_stopping_strings_macro=false', () => {
    expect(
      getOaiCustomStoppingStrings(
        { custom_stopping_strings: '["{{user}}:"]', custom_stopping_strings_macro: false },
        identity,
      ),
    ).toEqual(['{{user}}:']);
  });

  it('returns [] for invalid JSON or non-arrays', () => {
    expect(getOaiCustomStoppingStrings({ custom_stopping_strings: 'oops' }, identity)).toEqual([]);
    expect(getOaiCustomStoppingStrings({ custom_stopping_strings: '{"a":1}' }, identity)).toEqual([]);
    expect(getOaiCustomStoppingStrings({}, identity)).toEqual([]);
  });
});

describe('bias and impersonation placement in buildChatCompletionMessages', () => {
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
    prompts: [
      { identifier: 'main', content: 'You are {{char}}.' },
      { identifier: 'jailbreak', content: 'Stay in character.' },
    ],
    prompt_order: [{ character_id: 100000, order: DEFAULT_PROMPT_ORDER }],
  };
  const history = [
    { name: 'Seraphina', mes: 'Hello', isUser: false },
    { name: 'Dennis', mes: 'Hi', isUser: true },
  ];

  it('places the bias as the trailing assistant entry, after post-history prompts', async () => {
    const out = await buildChatCompletionMessages({
      oai,
      fields,
      identity,
      history,
      maxContext: 8192,
      maxTokens: 512,
      countTokens: () => 1,
      bias: 'Sure, {{user}},',
    });
    expect(out[out.length - 1]).toEqual({ role: 'assistant', content: 'Sure, Dennis,' });
    expect(out[out.length - 2]).toEqual({ role: 'system', content: 'Stay in character.' });
  });

  it('skips a whitespace-only bias', async () => {
    const out = await buildChatCompletionMessages({
      oai,
      fields,
      identity,
      history,
      maxContext: 8192,
      maxTokens: 512,
      countTokens: () => 1,
      bias: '   ',
    });
    expect(out[out.length - 1]).toEqual({ role: 'system', content: 'Stay in character.' });
  });

  it('appends the impersonation prompt as the final control message', async () => {
    const out = await buildChatCompletionMessages({
      oai: { ...oai, impersonation_prompt: 'Impersonate {{user}}.' },
      fields,
      identity,
      history,
      maxContext: 8192,
      maxTokens: 512,
      countTokens: () => 1,
      type: 'impersonate',
    });
    expect(out[out.length - 1]).toEqual({ role: 'system', content: 'Impersonate Dennis.' });
  });

  it('uses the desktop default impersonation prompt when none is configured', async () => {
    const out = await buildChatCompletionMessages({
      oai,
      fields,
      identity,
      history,
      maxContext: 8192,
      maxTokens: 512,
      countTokens: () => 1,
      type: 'impersonate',
    });
    const last = out[out.length - 1]!;
    expect(last.role).toBe('system');
    expect(last.content).toContain('Write your next reply from the point of view of Dennis');
  });

  it('sends no impersonation prompt when the user cleared it (desktop parity)', async () => {
    const out = await buildChatCompletionMessages({
      oai: { ...oai, impersonation_prompt: '' },
      fields,
      identity,
      history,
      maxContext: 8192,
      maxTokens: 512,
      countTokens: () => 1,
      type: 'impersonate',
    });
    expect(out[out.length - 1]).toEqual({ role: 'system', content: 'Stay in character.' });
  });
});

describe('buildChatCompletionGenerateRequest wiring', () => {
  const character: StCharacter = {
    name: 'Seraphina',
    description: 'A guardian.',
    personality: '',
    scenario: '',
    first_mes: 'F',
    mes_example: '',
    avatar: 'Seraphina.png',
  };
  const power: PowerUserSubset = {
    instruct: {
      enabled: false,
      input_sequence: '',
      output_sequence: '',
      wrap: false,
      macro: true,
      names_behavior: 'none',
    },
    context: { story_string: '' },
    sysprompt: { enabled: false, content: '' },
    user_prompt_bias: 'Sure,',
    custom_stopping_strings: '["{{user}}:", "###", "a", "b", "c"]',
    request_token_probabilities: true,
  };
  const oai: OaiSettings = {
    chat_completion_source: 'openai',
    openai_model: 'gpt-4o',
    openai_max_context: 8192,
    openai_max_tokens: 512,
    prompts: [{ identifier: 'main', content: 'You are {{char}}.' }],
    prompt_order: [{ character_id: 100000, order: DEFAULT_PROMPT_ORDER }],
    bias_preset_selected: 'mine',
    bias_presets: { mine: [{ text: 'Hello', value: 4 }] },
  };
  const history = [
    { name: 'Dennis', mes: 'Hi', isUser: true },
    { name: 'Seraphina', mes: 'Partial reply', isUser: false },
  ];
  const baseParams = {
    character,
    power,
    oai,
    identity,
    history,
    maxContext: 8192,
    maxTokens: 512,
    countTokens: () => 1,
    stream: true,
  };

  it('threads stop strings, logprobs, prompt bias and logit_bias into the body', async () => {
    const req = await buildChatCompletionGenerateRequest({
      ...baseParams,
      encodeTokens: async () => [11, 12],
    });
    expect(req.body.stop).toEqual(['Dennis:', '###', 'a', 'b']); // substituted + capped at 4
    expect(req.body.logprobs).toBe(5);
    expect(req.body.logit_bias).toEqual({ '11': 4, '12': 4 });
    expect(req.messages[req.messages.length - 1]).toEqual({ role: 'assistant', content: 'Sure,' });
  });

  it('omits logit_bias without an injected encoder', async () => {
    const req = await buildChatCompletionGenerateRequest(baseParams);
    expect(req.body.logit_bias).toBeUndefined();
  });

  it('drops the prompt bias on continue (getBiasStrings parity) and keeps the 18 continue messages intact', async () => {
    const req = await buildChatCompletionGenerateRequest({ ...baseParams, type: 'continue' });
    expect(req.messages.some((m) => m.content === 'Sure,')).toBe(false);
    const last = req.messages[req.messages.length - 1]!;
    const secondLast = req.messages[req.messages.length - 2]!;
    expect(secondLast).toMatchObject({ role: 'assistant', content: 'Partial reply' });
    expect(last.role).toBe('system');
    expect(last.content).toBe('[Continue your last message without repeating its original content.]');
    expect(req.body.type).toBe('continue');
  });

  it('drops the prompt bias on impersonate and ends with the impersonation prompt', async () => {
    const req = await buildChatCompletionGenerateRequest({ ...baseParams, type: 'impersonate' });
    expect(req.messages.some((m) => m.content === 'Sure,')).toBe(false);
    const last = req.messages[req.messages.length - 1]!;
    expect(last.role).toBe('system');
    expect(String(last.content)).toContain('point of view of Dennis');
  });

  it('honours an explicit promptBias override', async () => {
    const req = await buildChatCompletionGenerateRequest({ ...baseParams, promptBias: 'Listen:' });
    expect(req.messages[req.messages.length - 1]).toEqual({ role: 'assistant', content: 'Listen:' });
  });
});
