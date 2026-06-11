import { describe, expect, it } from 'vitest';
import { applyProfileToConfig, extractConnectionProfiles } from './profiles';
import type { EngineConfig } from './settings';

const parsed = {
  power_user: {
    connectionManager: {
      selectedProfile: 'b',
      profiles: [
        {
          id: 'a',
          name: 'Game Master',
          mode: 'tc',
          api: 'koboldcpp',
          'api-url': 'http://127.0.0.1:5001',
          preset: 'P1',
          instruct: 'Gemma 4',
          context: 'Gemma 4',
          sysprompt: 'Sphi',
          'sysprompt-state': 'true',
          'instruct-state': 'true',
        },
        {
          id: 'b',
          name: 'NSFW RP',
          mode: 'tc',
          'api-url': 'http://192.168.178.94:5001',
          'sysprompt-state': 'false',
        },
      ],
    },
  },
};

describe('connection profiles', () => {
  it('extracts profiles and the selected id', () => {
    const { profiles, selectedId } = extractConnectionProfiles(parsed);
    expect(profiles).toHaveLength(2);
    expect(selectedId).toBe('b');
    expect(profiles[0]?.apiUrl).toBe('http://127.0.0.1:5001');
    expect(profiles[1]?.syspromptState).toBe(false);
  });

  it('applies a profile: resolves named instruct/context/sysprompt/preset + api-url', () => {
    const base: EngineConfig = {
      power: {
        instruct: {
          enabled: true,
          input_sequence: 'OLD',
          output_sequence: 'OLD',
          wrap: false,
          macro: true,
          names_behavior: 'force',
        },
        context: { story_string: 'OLD' },
        sysprompt: { enabled: true, content: 'OLD' },
      },
      textgen: { type: 'koboldcpp', temp: 0.5, server_urls: { koboldcpp: 'http://x:5001' } },
      oai: { chat_completion_source: 'openai' },
      kai: {},
      nai: {},
      horde: {},
      mode: 'tc',
      identity: { user: 'D', char: 'S' },
      maxContext: 16384,
      maxTokens: 500,
      mainApi: 'textgenerationwebui',
    };
    const profile = extractConnectionProfiles(parsed).profiles[0]!;
    const response = {
      instruct: [
        { name: 'Gemma 4', input_sequence: '<|turn>user\n', output_sequence: '<|turn>model\n', wrap: false, macro: true, names_behavior: 'force' as const, enabled: false },
      ],
      context: [{ name: 'Gemma 4', story_string: 'NEW STORY' }],
      sysprompt: [{ name: 'Sphi', content: 'SYS CONTENT' }],
      textgenerationwebui_preset_names: ['P0', 'P1'],
      textgenerationwebui_presets: [{ temp: 0.1 }, { temp: 0.9, top_p: 0.95 }],
    };

    const out = applyProfileToConfig(base, profile, response);
    expect(out.power.instruct.input_sequence).toBe('<|turn>user\n');
    expect(out.power.instruct.enabled).toBe(true); // instruct-state overrides the template's flag
    expect(out.power.context.story_string).toBe('NEW STORY');
    expect(out.power.sysprompt).toEqual({ enabled: true, content: 'SYS CONTENT', post_history: '' });
    expect(out.textgen.temp).toBe(0.9);
    expect(out.textgen.top_p).toBe(0.95);
    expect(out.textgen.type).toBe('koboldcpp');
    expect(out.textgen.server_urls).toEqual({ koboldcpp: 'http://x:5001' });
    expect(out.apiServerOverride).toBe('http://127.0.0.1:5001');
  });
});
