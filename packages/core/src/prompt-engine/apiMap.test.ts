import { describe, expect, it } from 'vitest';
import { normalizeMainApi, resolveApiSlug } from './apiMap';
import { parsePresetArray, presetsByName } from './presetArrays';
import { applyProfileToConfig } from './profiles';
import { extractEngineConfig } from './settings';

describe('resolveApiSlug (CONNECT_API_MAP port)', () => {
  it('maps the explicit desktop entries', () => {
    expect(resolveApiSlug('kobold')).toEqual({ mainApi: 'kobold' });
    expect(resolveApiSlug('horde')).toEqual({ mainApi: 'koboldhorde' });
    expect(resolveApiSlug('novel')).toEqual({ mainApi: 'novel' });
    expect(resolveApiSlug('koboldcpp')).toEqual({ mainApi: 'textgenerationwebui', textgenType: 'koboldcpp' });
    expect(resolveApiSlug('kcpp')).toEqual({ mainApi: 'textgenerationwebui', textgenType: 'koboldcpp' });
    expect(resolveApiSlug('oai')).toEqual({ mainApi: 'openai', ccSource: 'openai' });
    expect(resolveApiSlug('google')).toEqual({ mainApi: 'openai', ccSource: 'makersuite' });
  });

  it('disambiguates openrouter chat vs text', () => {
    expect(resolveApiSlug('openrouter')).toEqual({ mainApi: 'openai', ccSource: 'openrouter' });
    expect(resolveApiSlug('openrouter-text')).toEqual({ mainApi: 'textgenerationwebui', textgenType: 'openrouter' });
  });

  it('auto-fills textgen types and cc sources', () => {
    expect(resolveApiSlug('ollama')).toEqual({ mainApi: 'textgenerationwebui', textgenType: 'ollama' });
    expect(resolveApiSlug('claude')).toEqual({ mainApi: 'openai', ccSource: 'claude' });
    expect(resolveApiSlug('deepseek')).toEqual({ mainApi: 'openai', ccSource: 'deepseek' });
  });

  it('returns null for unknown slugs and empty input', () => {
    expect(resolveApiSlug('definitely-not-an-api')).toBeNull();
    expect(resolveApiSlug(undefined)).toBeNull();
  });
});

describe('normalizeMainApi', () => {
  it('keeps known values and falls back to textgenerationwebui', () => {
    expect(normalizeMainApi('novel')).toBe('novel');
    expect(normalizeMainApi('kobold')).toBe('kobold');
    expect(normalizeMainApi('weird')).toBe('textgenerationwebui');
    expect(normalizeMainApi(undefined)).toBe('textgenerationwebui');
  });
});

describe('parsePresetArray', () => {
  it('parses raw JSON-string arrays (desktop readPresetsFromDirectory shape)', () => {
    const arr = ['{"temp":1.2,"top_p":0.9}', '{"temp":0.7}'];
    expect(parsePresetArray(arr)).toEqual([{ temp: 1.2, top_p: 0.9 }, { temp: 0.7 }]);
  });

  it('passes through already-parsed objects and skips malformed entries', () => {
    const arr = [{ temp: 1 }, 'not json', '42', null];
    expect(parsePresetArray(arr)).toEqual([{ temp: 1 }]);
  });

  it('pairs presets with their names', () => {
    const map = presetsByName(['{"temp":1}', '{"temp":2}'], ['A', 'B']);
    expect(map.get('B')).toEqual({ temp: 2 });
  });
});

describe('applyProfileToConfig with raw-string preset arrays (regression)', () => {
  const base = extractEngineConfig(
    { main_api: 'textgenerationwebui', textgenerationwebui_settings: { type: 'koboldcpp', temp: 0.5 } },
    'Seraphina',
  );

  it('applies a TC preset delivered as a raw JSON string', () => {
    const next = applyProfileToConfig(
      base,
      { id: '1', name: 'P', mode: 'tc', preset: 'MyPreset' },
      {
        textgenerationwebui_preset_names: ['MyPreset'],
        textgenerationwebui_presets: ['{"temp":1.7,"top_k":40}'],
      },
    );
    expect((next.textgen as { temp?: number }).temp).toBe(1.7);
    expect((next.textgen as { top_k?: number }).top_k).toBe(40);
    expect(next.textgen.type).toBe('koboldcpp');
  });

  it('applies a CC preset delivered as a raw JSON string and keeps the resolved source', () => {
    const next = applyProfileToConfig(
      base,
      { id: '2', name: 'C', mode: 'cc', api: 'claude', preset: 'Cloud' },
      {
        openai_setting_names: ['Cloud'],
        openai_settings: ['{"temp_openai":0.9}'],
      },
    );
    expect(next.mode).toBe('cc');
    expect(next.mainApi).toBe('openai');
    expect(next.oai.chat_completion_source).toBe('claude');
    expect((next.oai as { temp_openai?: number }).temp_openai).toBe(0.9);
  });

  it('routes profile api slugs to mainApi (kobold / novel / horde)', () => {
    expect(applyProfileToConfig(base, { id: '3', name: 'K', api: 'kobold' }, {}).mainApi).toBe('kobold');
    expect(applyProfileToConfig(base, { id: '4', name: 'N', api: 'novel' }, {}).mainApi).toBe('novel');
    const horde = applyProfileToConfig(base, { id: '5', name: 'H', api: 'horde' }, {});
    expect(horde.mainApi).toBe('koboldhorde');
    expect(horde.mode).toBe('tc');
  });
});
