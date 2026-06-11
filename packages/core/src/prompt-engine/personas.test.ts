import { describe, expect, it } from 'vitest';
import {
  PERSONA_DEFAULT_DEPTH,
  PERSONA_DEFAULT_ROLE,
  PERSONA_POSITIONS,
  deletePersonaFromSettings,
  setDefaultPersona,
  upsertPersona,
} from './personas';
import { applyPersonaToConfig, extractEngineConfig, extractPersonas, type Persona } from './settings';

function settingsWith(personaBits: Record<string, unknown>): Record<string, unknown> {
  return { user_avatar: 'a.png', power_user: { ...personaBits } };
}

describe('upsertPersona', () => {
  it('creates a persona with the exact desktop default descriptor shape', () => {
    const s: Record<string, unknown> = {};
    upsertPersona(s, 'new.png', { name: 'Dennis' });

    const pu = s.power_user as Record<string, Record<string, unknown>>;
    expect(pu.personas).toEqual({ 'new.png': 'Dennis' });
    expect(pu.persona_descriptions!['new.png']).toEqual({
      description: '',
      position: PERSONA_POSITIONS.IN_PROMPT,
      depth: PERSONA_DEFAULT_DEPTH,
      role: PERSONA_DEFAULT_ROLE,
      lorebook: '',
      title: '',
    });
  });

  it('merges only known keys and preserves connections/lorebook/unknown fields', () => {
    const s = settingsWith({
      personas: { 'a.png': 'Old Name' },
      persona_descriptions: {
        'a.png': {
          description: 'old',
          position: PERSONA_POSITIONS.AT_DEPTH,
          depth: 7,
          role: 1,
          lorebook: 'My Lore',
          title: 'The Brave',
          connections: [{ type: 'character', id: 'char.png' }],
          some_future_field: 42,
        },
      },
    });

    upsertPersona(s, 'a.png', { name: 'New Name', description: 'new', position: PERSONA_POSITIONS.IN_PROMPT });

    const pu = s.power_user as Record<string, Record<string, unknown>>;
    expect(pu.personas!['a.png']).toBe('New Name');
    expect(pu.persona_descriptions!['a.png']).toEqual({
      description: 'new',
      position: PERSONA_POSITIONS.IN_PROMPT,
      depth: 7,
      role: 1,
      lorebook: 'My Lore',
      title: 'The Brave',
      connections: [{ type: 'character', id: 'char.png' }],
      some_future_field: 42,
    });
  });

  it('keeps the existing name when fields.name is omitted', () => {
    const s = settingsWith({ personas: { 'a.png': 'Keep Me' }, persona_descriptions: { 'a.png': { description: '' } } });
    upsertPersona(s, 'a.png', { description: 'updated' });
    const pu = s.power_user as Record<string, Record<string, Record<string, unknown>>>;
    expect(pu.personas!['a.png']).toBe('Keep Me');
    expect(pu.persona_descriptions!['a.png']!.description).toBe('updated');
  });

  it('does not touch other personas or unrelated settings keys', () => {
    const s = settingsWith({
      personas: { 'b.png': 'Other' },
      persona_descriptions: { 'b.png': { description: 'other desc' } },
      default_persona: 'b.png',
    });
    (s as Record<string, unknown>).main_api = 'textgenerationwebui';

    upsertPersona(s, 'a.png', { name: 'A' });

    const pu = s.power_user as Record<string, Record<string, unknown>>;
    expect(pu.personas!['b.png']).toBe('Other');
    expect(pu.persona_descriptions!['b.png']).toEqual({ description: 'other desc' });
    expect(pu.default_persona).toBe('b.png');
    expect(s.main_api).toBe('textgenerationwebui');
  });
});

describe('deletePersonaFromSettings', () => {
  it('removes the persona from personas + persona_descriptions', () => {
    const s = settingsWith({
      personas: { 'a.png': 'A', 'b.png': 'B' },
      persona_descriptions: { 'a.png': { description: 'a' }, 'b.png': { description: 'b' } },
    });
    deletePersonaFromSettings(s, 'a.png');
    const pu = s.power_user as Record<string, Record<string, unknown>>;
    expect(pu.personas).toEqual({ 'b.png': 'B' });
    expect(pu.persona_descriptions).toEqual({ 'b.png': { description: 'b' } });
  });

  it('clears default_persona (to null, desktop parity) when it matches', () => {
    const s = settingsWith({
      personas: { 'a.png': 'A' },
      persona_descriptions: { 'a.png': {} },
      default_persona: 'a.png',
    });
    deletePersonaFromSettings(s, 'a.png');
    expect((s.power_user as Record<string, unknown>).default_persona).toBeNull();
  });

  it('leaves a different default_persona alone', () => {
    const s = settingsWith({ personas: { 'a.png': 'A' }, persona_descriptions: {}, default_persona: 'b.png' });
    deletePersonaFromSettings(s, 'a.png');
    expect((s.power_user as Record<string, unknown>).default_persona).toBe('b.png');
  });

  it('clears the root user_avatar when it pointed at the deleted persona', () => {
    const s = settingsWith({ personas: { 'a.png': 'A' }, persona_descriptions: { 'a.png': {} } });
    expect(s.user_avatar).toBe('a.png');
    deletePersonaFromSettings(s, 'a.png');
    expect('user_avatar' in s).toBe(false);
  });

  it('leaves an unrelated root user_avatar alone', () => {
    const s = settingsWith({ personas: { 'a.png': 'A', 'b.png': 'B' }, persona_descriptions: {} });
    deletePersonaFromSettings(s, 'b.png');
    expect(s.user_avatar).toBe('a.png');
  });
});

describe('applyPersonaToConfig', () => {
  const baseConfig = () => extractEngineConfig({ main_api: 'koboldcpp' }, 'Seraphina');
  const persona = (over: Partial<Persona> = {}): Persona => ({
    avatar: 'a.png',
    name: 'Dennis',
    description: 'PD',
    position: PERSONA_POSITIONS.AT_DEPTH,
    depth: 7,
    role: 2,
    title: '',
    ...over,
  });

  it('copies name, description and the full position/depth/role descriptor (selectCurrentPersona)', () => {
    const config = applyPersonaToConfig(baseConfig(), persona());
    expect(config.identity.user).toBe('Dennis');
    expect(config.power.persona_description).toBe('PD');
    expect(config.power.persona_description_position).toBe(PERSONA_POSITIONS.AT_DEPTH);
    expect(config.power.persona_description_depth).toBe(7);
    expect(config.power.persona_description_role).toBe(2);
  });

  it('migrates the deprecated AFTER_CHAR position to IN_PROMPT (personas.js:626-628)', () => {
    const config = applyPersonaToConfig(baseConfig(), persona({ position: PERSONA_POSITIONS.AFTER_CHAR }));
    expect(config.power.persona_description_position).toBe(PERSONA_POSITIONS.IN_PROMPT);
  });
});

describe('setDefaultPersona', () => {
  it('sets the default persona', () => {
    const s = settingsWith({});
    setDefaultPersona(s, 'a.png');
    expect((s.power_user as Record<string, unknown>).default_persona).toBe('a.png');
  });

  it('clearing removes the key entirely (desktop toggle parity)', () => {
    const s = settingsWith({ default_persona: 'a.png' });
    setDefaultPersona(s, null);
    expect('default_persona' in (s.power_user as Record<string, unknown>)).toBe(false);
  });
});

describe('extractPersonas (extended)', () => {
  it('returns defaultPersona and per-persona position/depth/role/title with defaults', () => {
    const s = settingsWith({
      personas: { 'a.png': 'A', 'b.png': 'B' },
      persona_descriptions: {
        'a.png': { description: 'desc', position: 4, depth: 6, role: 2, title: 'Hero' },
      },
      default_persona: 'b.png',
    });

    const list = extractPersonas(s);
    expect(list.defaultPersona).toBe('b.png');
    expect(list.activeAvatar).toBe('a.png');

    const a = list.personas.find((p) => p.avatar === 'a.png')!;
    expect(a).toMatchObject({ description: 'desc', position: 4, depth: 6, role: 2, title: 'Hero' });

    // b.png has no descriptor: desktop defaults apply.
    const b = list.personas.find((p) => p.avatar === 'b.png')!;
    expect(b).toMatchObject({ description: '', position: 0, depth: 2, role: 0, title: '' });
  });
});
