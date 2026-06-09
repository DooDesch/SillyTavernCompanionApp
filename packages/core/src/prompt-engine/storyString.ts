/**
 * Renders SillyTavern's context `story_string` template.
 *
 * ST uses Handlebars (`Handlebars.compile`, which relies on `new Function` and is unavailable in
 * Hermes). The story_string templates only use `{{#if var}}…{{else}}…{{/if}}`, `{{var}}` and the
 * `{{trim}}` helper, so this implements exactly that subset - no eval, Hermes-safe.
 */

export type StoryStringData = Record<string, string>;

/** Resolve `{{#if key}}…{{/if}}` blocks (with optional `{{else}}`), innermost-first for nesting. */
function resolveConditionals(template: string, data: StoryStringData): string {
  const innermost = /{{#if\s+([\w.]+)}}((?:(?!{{#if)[\s\S])*?){{\/if}}/;
  let prev: string;
  let out = template;
  do {
    prev = out;
    out = out.replace(innermost, (_match, key: string, body: string) => {
      let truthyBody = body;
      let falsyBody = '';
      const elseIdx = body.indexOf('{{else}}');
      if (elseIdx !== -1) {
        truthyBody = body.slice(0, elseIdx);
        falsyBody = body.slice(elseIdx + '{{else}}'.length);
      }
      const value = data[key];
      const truthy = value !== undefined && value !== null && String(value).length > 0;
      return truthy ? truthyBody : falsyBody;
    });
  } while (out !== prev);
  return out;
}

export function renderStoryString(template: string, data: StoryStringData): string {
  let out = resolveConditionals(template, data);

  // Substitute {{var}} (leave {{trim}} for the helper pass; unknown vars render empty, like Handlebars).
  out = out.replace(/{{([\w.]+)}}/g, (match, key: string) => {
    if (key === 'trim') return match;
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] ?? '' : '';
  });

  // {{trim}} helper: collapse surrounding newlines (matches the evaluateMacros trim semantics).
  out = out.replace(/(?:\r?\n)*{{trim}}(?:\r?\n)*/g, '');

  // ST renderStoryString strips leading newlines from the final output (power-user.js).
  out = out.replace(/^\n+/, '');

  return out;
}
