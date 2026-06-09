/**
 * Macro substitution — a faithful, Hermes-safe port of the legacy `evaluateMacros` pipeline
 * (public/scripts/macros.js). Order is preserved: pre-env built-ins → env variables → post-env
 * built-ins. Unknown `{{...}}` are left intact, exactly like SillyTavern.
 *
 * DOM/global-coupled macros from ST ({{input}}, {{lastMessage}}, token-budget macros) are omitted;
 * the engine injects what it needs via `env`. Randomness uses Math.random (app runtime) — tests
 * avoid asserting on random/time output.
 */

export type MacroValue = string | number | undefined | null;
export type EnvObject = Record<string, MacroValue | ((nonce: string) => MacroValue)>;

function resolve(value: MacroValue | ((nonce: string) => MacroValue), nonce: string): string {
  const v = typeof value === 'function' ? value(nonce) : value;
  return v === undefined || v === null ? '' : String(v);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Substitute macros in `content` against `env`. */
export function substituteMacros(content: string, env: EnvObject): string {
  if (!content) return '';
  const nonce = 'n';

  // Pre-env built-ins (legacy angle-bracket aliases + simple curly built-ins).
  const userVal = () => resolve(env.user, nonce);
  const charVal = () => resolve(env.char, nonce);
  content = content
    .replace(/<USER>/gi, userVal)
    .replace(/<BOT>/gi, charVal)
    .replace(/<CHAR>/gi, charVal)
    .replace(/{{newline}}/gi, '\n')
    .replace(/(?:\r?\n)*{{trim}}(?:\r?\n)*/gi, '')
    .replace(/{{noop}}/gi, '');

  // Env variables (case-insensitive, longest-named first so e.g. {{charPrompt}} isn't eaten by {{char}}).
  const keys = Object.keys(env).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (!content.includes('{{')) break;
    const regex = new RegExp(`{{${escapeRegex(key)}}}`, 'gi');
    content = content.replace(regex, () => resolve(env[key], nonce));
  }

  // Post-env built-ins.
  content = content
    .replace(/{{reverse:(.+?)}}/gi, (_m, str: string) => Array.from(str).reverse().join(''))
    .replace(/\{\{\/\/([\s\S]*?)\}\}/g, '')
    .replace(/{{time}}/gi, () => {
      // Locale short time (~moment 'LT'), e.g. "1:45 PM" / "13:45".
      return new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    })
    .replace(/{{date}}/gi, () =>
      new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
    )
    .replace(/{{weekday}}/gi, () => new Date().toLocaleDateString(undefined, { weekday: 'long' }))
    .replace(/{{isotime}}/gi, () => {
      const d = new Date();
      return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    })
    .replace(/{{isodate}}/gi, () => {
      const d = new Date();
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    })
    .replace(/{{roll[ :]([^}]+)}}/gi, (_m, formula: string) => String(rollDice(formula)))
    .replace(/{{random[ :]([^}]+)}}/gi, (_m, list: string) => pickRandom(splitMacroList(list)))
    .replace(/{{pick[ :]([^}]+)}}/gi, (_m, list: string) => pickRandom(splitMacroList(list)));

  return content;
}

function splitMacroList(raw: string): string[] {
  if (raw.includes('::')) {
    return raw.split('::').map((s) => s.trim());
  }
  // Comma-separated: honour escaped commas (\,) as literal commas, like ST.
  const PLACEHOLDER = '##¤COMMA¤##';
  return raw
    .replace(/\\,/g, PLACEHOLDER)
    .split(',')
    .map((s) => s.trim().split(PLACEHOLDER).join(','));
}

function pickRandom(items: string[]): string {
  if (items.length === 0) return '';
  // eslint-disable-next-line no-restricted-properties
  return items[Math.floor(Math.random() * items.length)] ?? '';
}

function rollDice(formula: string): number {
  const m = /^(\d*)d(\d+)$/i.exec(formula.trim());
  if (!m) {
    const n = Number(formula);
    return Number.isFinite(n) ? n : 0;
  }
  const count = m[1] ? Number(m[1]) : 1;
  const sides = Number(m[2]);
  let total = 0;
  for (let i = 0; i < count; i++) total += Math.floor(Math.random() * sides) + 1;
  return total;
}
