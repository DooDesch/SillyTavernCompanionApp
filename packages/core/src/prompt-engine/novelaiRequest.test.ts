import { describe, expect, it } from 'vitest';
import { buildNovelGenerateRequest, type NovelGenerateParams } from './generate';
import { NOVELAI_GENERATE_PATH } from './novelai';
import type { PowerUserSubset } from './types';
import type { StCharacter } from '../types/character';

// Plain non-instruct config (same shape as m2-parity.test.ts) so the novel prompt
// nuances (preamble slot + force_name2 line) are byte-assertable.
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

const naiBlock = {
  model_novel: 'clio-v1',
  preamble: '[ Style: chat ]',
  prefix: 'vanilla',
  temperature: 1.5,
  min_length: 1,
  streaming_novel: false,
};

const base = (over: Partial<NovelGenerateParams> = {}): NovelGenerateParams => ({
  character: char,
  power: plainPower,
  nai: naiBlock,
  identity: { user: 'Dennis', char: 'Seraphina' },
  history: [
    { name: 'Seraphina', mes: 'F', isUser: false },
    { name: 'Dennis', mes: 'Hey', isUser: true },
  ],
  maxContext: 8192,
  maxTokens: 64,
  countTokens: () => 1,
  encode: (_slug, text) => Promise.resolve([text.length]),
  ...over,
});

describe('buildNovelGenerateRequest - prompt assembly', () => {
  it('places the preamble after the examples and forces the char name on the last line', async () => {
    const req = await buildNovelGenerateRequest(base());
    // story string, preamble + '\n', chat block, forced "\nSeraphina:" (force_name2).
    expect(req.prompt).toBe('D\n[ Style: chat ]\nSeraphina: F\nDennis: Hey\nSeraphina:');
    expect(req.body.input).toBe(req.prompt);
    expect(req.url).toBe(NOVELAI_GENERATE_PATH);
    expect(req.streaming).toBe(false);
  });

  it('keeps the desktop order preamble BEFORE chat_start (addChatsPreamble after addChatsSeparator)', async () => {
    const req = await buildNovelGenerateRequest(
      base({ power: { ...plainPower, context: { ...plainPower.context, chat_start: '***' } } }),
    );
    expect(req.prompt).toBe('D\n[ Style: chat ]\n***\nSeraphina: F\nDennis: Hey\nSeraphina:');
  });

  it('substitutes macros in the preamble', async () => {
    const req = await buildNovelGenerateRequest(base({ nai: { ...naiBlock, preamble: '[ {{char}} ]' } }));
    expect(req.prompt).toContain('[ Seraphina ]\n');
  });

  it('falls back to the default preamble when the settings block has none', async () => {
    const req = await buildNovelGenerateRequest(base({ nai: { model_novel: 'clio-v1' } }));
    expect(req.prompt).toContain('[ Style: chat, complex, sensory, visceral ]\n');
  });

  it('impersonate appends the user name instead (force_name2 cleared, script.js:4553/5010-5017)', async () => {
    const req = await buildNovelGenerateRequest(base({ isImpersonate: true }));
    expect(req.prompt.endsWith('Dennis: Hey\nDennis:')).toBe(true);
    expect(req.prompt).not.toContain('Hey\nSeraphina:');
    // Desktop getStoppingStrings(isImpersonate=true): char string first, then user string.
    expect(req.stoppingStrings[0]).toBe('\nSeraphina:');
    expect(req.stoppingStrings).toContain('\nDennis:');
  });

  it('continue keeps the desktop name-append quirk before the cycle prompt (script.js:5019-5029)', async () => {
    const req = await buildNovelGenerateRequest(
      base({
        history: [
          { name: 'Seraphina', mes: 'F', isUser: false },
          { name: 'Dennis', mes: 'Hello', isUser: true },
          { name: 'Seraphina', mes: 'Partial', isUser: false },
        ],
        type: 'continue',
      }),
    );
    // Faithful to desktop: "Seraphina:" is appended to the last in-context line, then the
    // suffix-free partial reply (which already carries its name prefix) follows.
    expect(req.prompt.endsWith('Dennis: Hello\nSeraphina:Seraphina: Partial')).toBe(true);
  });

  it('continue on a user message does not append the char name', async () => {
    const req = await buildNovelGenerateRequest(
      base({
        history: [
          { name: 'Seraphina', mes: 'F', isUser: false },
          { name: 'Dennis', mes: 'Part', isUser: true },
        ],
        type: 'continue',
      }),
    );
    expect(req.prompt.endsWith('Seraphina: F\nDennis: Part')).toBe(true);
  });

  it('continue on the first (lone) message appends nothing', async () => {
    const req = await buildNovelGenerateRequest(
      base({ history: [{ name: 'Seraphina', mes: 'F', isUser: false }], type: 'continue' }),
    );
    expect(req.prompt.endsWith('Seraphina: F')).toBe(true);
  });

  it('appends the name cue even for an EMPTY history (script.js:4780-4782 empty chat2 entry)', async () => {
    const req = await buildNovelGenerateRequest(base({ history: [] }));
    // story string, preamble, then the forced "\nSeraphina:" cue with nothing in between.
    expect(req.prompt).toBe('D\n[ Style: chat ]\n\nSeraphina:');
  });

  it('instruct mode keeps its own prompt line - no extra name append', async () => {
    const req = await buildNovelGenerateRequest(
      base({
        power: {
          ...plainPower,
          instruct: {
            ...plainPower.instruct,
            enabled: true,
            input_sequence: '<u>\n',
            output_sequence: '<m>\n',
            wrap: false,
            macro: true,
            names_behavior: 'none',
          },
        },
      }),
    );
    expect(req.prompt.endsWith('<m>\n')).toBe(true);
    expect(req.prompt).not.toContain('\nSeraphina:');
    // The preamble is still injected for novel even in instruct mode.
    expect(req.prompt).toContain('[ Style: chat ]\n');
  });
});

describe('buildNovelGenerateRequest - settings resolution', () => {
  it('ignores the preset order (desktop dead code) and falls back to the default order', async () => {
    // Desktop's preset fallback (nai-settings.js:604) never fires: loadNovelSettings (:259)
    // always backfills nai_settings.order with `settings.order || default_order`.
    const req = await buildNovelGenerateRequest(
      base({
        nai: { ...naiBlock, preset_settings_novel: 'My-Preset' },
        novelaiSettings: [JSON.stringify({ order: [9, 8, 7] }), JSON.stringify({ order: [0] })],
        novelaiSettingNames: ['My-Preset', 'Other'],
      }),
    );
    expect(req.body.order).toEqual([1, 5, 0, 2, 3, 4]);
  });

  it('live nai order wins', async () => {
    const req = await buildNovelGenerateRequest(
      base({
        nai: { ...naiBlock, order: [4, 2], preset_settings_novel: 'My-Preset' },
        novelaiSettings: [JSON.stringify({ order: [9, 8, 7] })],
        novelaiSettingNames: ['My-Preset'],
      }),
    );
    expect(req.body.order).toEqual([4, 2]);
  });

  it('reports streaming_novel as the transport flag', async () => {
    const req = await buildNovelGenerateRequest(base({ nai: { ...naiBlock, streaming_novel: true } }));
    expect(req.streaming).toBe(true);
  });

  it('budgets against the clamped novel context (kayra Tablet: 4096) minus the response length', async () => {
    // Each line costs 1000 "tokens"; with maxContext 20000 the kayra Tablet clamp (4096)
    // minus maxTokens (64) is the effective budget -> the newest 3 history lines fit
    // (base 1000 + 3000 = 4000 < 4032).
    const history = Array.from({ length: 10 }, (_, i) => ({
      name: i % 2 ? 'Seraphina' : 'Dennis',
      mes: `m${i}`,
      isUser: i % 2 === 0,
    }));
    const req = await buildNovelGenerateRequest(
      base({
        nai: { ...naiBlock, model_novel: 'kayra-v1' },
        history,
        maxContext: 20000,
        countTokens: () => 1000,
        tier: 1,
      }),
    );
    expect(req.includedMessages).toBe(3);

    // A bigger response reservation (getMaxPromptTokens = clamped - amount_gen,
    // script.js:5922-5929) shrinks the budget below 4000 -> only 2 lines fit.
    const reqBigResponse = await buildNovelGenerateRequest(
      base({
        nai: { ...naiBlock, model_novel: 'kayra-v1' },
        history,
        maxContext: 20000,
        maxTokens: 100,
        countTokens: () => 1000,
        tier: 1,
      }),
    );
    expect(reqBigResponse.includedMessages).toBe(2);
  });
});
