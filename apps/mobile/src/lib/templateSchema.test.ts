import { describe, expect, it } from 'vitest';
import { autoFixStoryString, byName, buildSelectPatch, mergeTemplate, TEMPLATE_FIELDS, TEMPLATE_SECTIONS } from './templateSchema';

describe('templateSchema', () => {
  it('every field belongs to a declared section', () => {
    for (const kind of ['instruct', 'context', 'sysprompt'] as const) {
      for (const field of TEMPLATE_FIELDS[kind]) {
        expect(TEMPLATE_SECTIONS[kind]).toContain(field.section);
      }
    }
  });

  it('byName resolves templates and tolerates missing input', () => {
    const arr = [{ name: 'Alpaca' }, { name: 'ChatML' }];
    expect(byName(arr, 'ChatML')?.name).toBe('ChatML');
    expect(byName(arr, 'Nope')).toBeUndefined();
    expect(byName(undefined, 'ChatML')).toBeUndefined();
    expect(byName(arr, undefined)).toBeUndefined();
  });

  it('mergeTemplate preserves unknown keys and never trims whitespace', () => {
    const base = {
      name: 'ChatML',
      input_sequence: '<|im_start|>user\n',
      story_string_position: 1,
      some_future_key: { nested: true },
    };
    const merged = mergeTemplate(base, { input_sequence: '\n<|im_start|>user\n' }, 'ChatML');
    expect(merged.input_sequence).toBe('\n<|im_start|>user\n');
    expect(merged.story_string_position).toBe(1);
    expect(merged.some_future_key).toEqual({ nested: true });
    expect(merged.name).toBe('ChatML');
  });

  it('mergeTemplate stamps the target name over base and draft', () => {
    expect(mergeTemplate({ name: 'Old' }, {}, 'Copy of Old').name).toBe('Copy of Old');
    expect(mergeTemplate(undefined, { wrap: false }, 'Fresh')).toEqual({ wrap: false, name: 'Fresh' });
  });

  describe('buildSelectPatch: instruct (desktop #instruct_presets change handler)', () => {
    it('sets .preset, copies defined fields and resets migration-backed keys', () => {
      const { fields, globals } = buildSelectPatch('instruct', {
        name: 'ChatML',
        input_sequence: '<|im_start|>user',
        output_sequence: '<|im_start|>assistant',
        wrap: false,
      });
      expect(globals).toBeUndefined();
      expect(fields.preset).toBe('ChatML');
      expect(fields.input_sequence).toBe('<|im_start|>user');
      expect(fields.wrap).toBe(false);
      // migrateInstructModeSettings defaults fill keys the file does not carry
      expect(fields.system_same_as_user).toBe(false);
      expect(fields.names_behavior).toBe('force');
      expect(fields.sequences_as_stop_strings).toBe(true);
      expect(fields.story_string_prefix).toBe('');
      // 'macro' has no migration default - absent keys keep the live power_user value
      expect('macro' in fields).toBe(false);
      // enabled is only copied when the file defines it
      expect('enabled' in fields).toBe(false);
      // name itself is not an instruct control - only .preset carries the selection
      expect('name' in fields).toBe(false);
    });

    it('migrates legacy separator_sequence into output_suffix', () => {
      const { fields } = buildSelectPatch('instruct', { name: 'Old', separator_sequence: '</s>' });
      expect(fields.output_suffix).toBe('</s>');
      expect('separator_sequence' in fields).toBe(false);
    });

    it('migrates legacy names/names_force_groups into names_behavior (instruct-mode.js:63-69)', () => {
      const always = buildSelectPatch('instruct', { name: 'Old', names: true, names_force_groups: false });
      expect(always.fields.names_behavior).toBe('always');
      expect('names' in always.fields).toBe(false);
      expect('names_force_groups' in always.fields).toBe(false);

      const force = buildSelectPatch('instruct', { name: 'Old', names: false, names_force_groups: true });
      expect(force.fields.names_behavior).toBe('force');

      const none = buildSelectPatch('instruct', { name: 'Old', names: false, names_force_groups: false });
      expect(none.fields.names_behavior).toBe('none');

      // Without the legacy keys the migrate default stays.
      const fresh = buildSelectPatch('instruct', { name: 'New' });
      expect(fresh.fields.names_behavior).toBe('force');
    });
  });

  describe('autoFixStoryString (power-user.js:1949-1981)', () => {
    it('splices missing anchorBefore/anchorAfter into legacy story strings', () => {
      const fixed = autoFixStoryString({
        name: 'Legacy',
        story_string: '{{#if system}}{{system}}\n{{/if}}{{trim}}',
      });
      expect(fixed.story_string).toBe(
        '{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}' +
          '{{#if system}}{{system}}\n{{/if}}' +
          '{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}' +
          '{{trim}}',
      );
    });

    it('skips templates that already carry story_string_position (already migrated)', () => {
      const tpl = { name: 'New', story_string: '{{description}}', story_string_position: 0 };
      expect(autoFixStoryString(tpl).story_string).toBe('{{description}}');
    });

    it('skips fields that are already present', () => {
      const ss =
        '{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}';
      expect(autoFixStoryString({ name: 'X', story_string: ss }).story_string).toBe(ss);
    });

    it('is applied on context select', () => {
      const { fields } = buildSelectPatch('context', {
        name: 'Legacy',
        story_string: '{{#if description}}{{description}}\n{{/if}}',
      });
      expect(String(fields.story_string).startsWith('{{#if anchorBefore}}')).toBe(true);
      expect(String(fields.story_string)).toContain('{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}');
    });
  });

  describe('buildSelectPatch: context (desktop #context_presets change handler)', () => {
    it('sets .preset, applies select-time fallbacks and splits the global keys', () => {
      const { fields, globals } = buildSelectPatch('context', {
        name: 'Minimal',
        story_string: '{{description}}',
        always_force_name2: false,
      });
      expect(fields.preset).toBe('Minimal');
      // The template carries no story_string_position -> autoFixStoryString splices the anchors in.
      expect(fields.story_string).toBe(
        '{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{description}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}',
      );
      // contextControls defaultValue fallbacks for keys the template lacks
      expect(fields.use_stop_strings).toBe(false);
      expect(fields.names_as_stop_strings).toBe(true);
      expect(fields.story_string_position).toBe(0);
      expect(fields.story_string_depth).toBe(1);
      expect(fields.story_string_role).toBe(0);
      // chat_start / example_separator have no default - left untouched when absent
      expect('chat_start' in fields).toBe(false);
      expect('example_separator' in fields).toBe(false);
      // globals land next to power_user.context, not inside it
      expect(globals).toEqual({ always_force_name2: false, trim_sentences: false, single_line: false });
      expect('always_force_name2' in fields).toBe(false);
    });
  });

  describe('buildSelectPatch: sysprompt (desktop $select change handler)', () => {
    it('sets .name, content/post_history with empty-string fallback and enables sysprompt', () => {
      const { fields, globals } = buildSelectPatch('sysprompt', { name: 'Blank' });
      expect(globals).toBeUndefined();
      expect(fields).toEqual({ name: 'Blank', enabled: true, content: '', post_history: '' });
    });

    it('passes content through without trimming', () => {
      const { fields } = buildSelectPatch('sysprompt', {
        name: 'Roleplay',
        content: 'Stay in character.\n',
        post_history: '\n[OOC ok]',
      });
      expect(fields.content).toBe('Stay in character.\n');
      expect(fields.post_history).toBe('\n[OOC ok]');
    });
  });
});
