import { NAMES_BEHAVIOR, type Identity } from './types';
import type { InstructContext } from './instruct';
import { substituteParams } from './substituteParams';

/**
 * Example-dialogue (`mes_example`) parsing & formatting - faithful port of SillyTavern's
 * `parseMesExamples` (script.js), `parseExampleIntoIndividual` (openai.js) and
 * `formatInstructModeExamples` (instruct-mode.js), scoped to single-character chats (no groups).
 */

/** Split a raw mes_example string into per-block strings, each prefixed by the right block heading. */
export function parseMesExamples(
  examplesStr: string,
  isInstruct: boolean,
  exampleSeparator: string,
  mainApiIsOpenai = false,
): string[] {
  if (!examplesStr || examplesStr.length === 0 || examplesStr === '<START>') return [];
  let s = examplesStr;
  if (!s.startsWith('<START>')) s = '<START>\n' + s.trim();
  const sep = exampleSeparator ? `${exampleSeparator}\n` : '';
  const blockHeading = mainApiIsOpenai || isInstruct ? '<START>\n' : sep;
  return s
    .split(/<START>/gi)
    .slice(1)
    .map((block) => `${blockHeading}${block.trim()}\n`);
}

export interface ExampleMessage {
  content: string;
  /** 'example_user' or 'example_assistant'. */
  name: 'example_user' | 'example_assistant';
}

/** Split one example block into individual user/assistant turns (single-character; no group names). */
export function parseExampleIntoIndividual(
  messageExampleString: string,
  name1: string,
  name2: string,
): ExampleMessage[] {
  const result: ExampleMessage[] = [];
  const tmp = messageExampleString.split('\n');
  let cur: string[] = [];
  let inUser = false;
  let inBot = false;

  const addMsg = (name: string, systemName: ExampleMessage['name']) => {
    const parsed = cur.join('\n').replace(name + ':', '').trim();
    result.push({ content: parsed, name: systemName });
    cur = [];
  };

  // Skip line 0 ("This is how {char} should talk").
  for (let i = 1; i < tmp.length; i++) {
    const line = tmp[i] ?? '';
    if (line.startsWith(name1 + ':')) {
      inUser = true;
      if (inBot) addMsg(name2, 'example_assistant');
      inBot = false;
    } else if (line.startsWith(name2 + ':')) {
      inBot = true;
      if (inUser) addMsg(name1, 'example_user');
      inUser = false;
    }
    cur.push(line);
  }
  if (inUser) addMsg(name1, 'example_user');
  else if (inBot) addMsg(name2, 'example_assistant');
  return result;
}

function applyName(value: string, name: string): string {
  return value.replace(/{{name}}/gi, name);
}

/** Port of `formatInstructModeExamples` (single-character). Returns instruct-wrapped block strings. */
export function formatInstructModeExamples(
  blocks: string[],
  ctx: InstructContext,
  name1: string,
  name2: string,
): string[] {
  const { instruct, context, identity } = ctx;
  const subst = (v: string) => substituteParams(v, { identity });
  const blockHeading = context.example_separator ? `${subst(context.example_separator)}\n` : '';

  if (instruct.skip_examples) return blocks.map((x) => x.replace(/<START>\n/i, blockHeading));

  const includeNames = instruct.names_behavior === NAMES_BEHAVIOR.ALWAYS;
  let inputPrefix = instruct.input_sequence || '';
  let outputPrefix = instruct.output_sequence || '';
  let inputSuffix = instruct.input_suffix || '';
  let outputSuffix = instruct.output_suffix || '';

  if (instruct.macro) {
    inputPrefix = applyName(subst(inputPrefix), name1);
    outputPrefix = applyName(subst(outputPrefix), name2);
    inputSuffix = applyName(subst(inputSuffix), name1);
    outputSuffix = applyName(subst(outputSuffix), name2);
    if (!inputSuffix && instruct.wrap) inputSuffix = '\n';
    if (!outputSuffix && instruct.wrap) outputSuffix = '\n';
  }

  const separator = instruct.wrap ? '\n' : '';
  const out: string[] = [];

  for (const item of blocks) {
    const cleaned = item.replace(/<START>/i, '{Example Dialogue:}').replace(/\r/gm, '');
    const blockExamples = parseExampleIntoIndividual(cleaned, name1, name2);
    if (blockExamples.length === 0) continue;
    if (blockHeading) out.push(blockHeading);
    for (const ex of blockExamples) {
      const includeThisName =
        includeNames || (instruct.names_behavior === NAMES_BEHAVIOR.FORCE && ex.name === 'example_user');
      const prefix = ex.name === 'example_user' ? inputPrefix : outputPrefix;
      const suffix = ex.name === 'example_user' ? inputSuffix : outputSuffix;
      const name = ex.name === 'example_user' ? name1 : name2;
      const messageContent = includeThisName ? `${name}: ${ex.content}` : ex.content;
      const formatted = [prefix, messageContent + suffix].filter((x) => x).join(separator);
      out.push(formatted);
    }
  }

  if (out.length === 0) return blocks.map((x) => x.replace(/<START>\n/i, blockHeading));
  return out;
}

/**
 * Convenience: produce the final example-dialogue block strings for the text-completion path
 * (parse → instruct-format when instruct is on). The caller handles pin/budget.
 */
export function getExampleBlocks(
  mesExamples: string,
  isInstruct: boolean,
  ctx: InstructContext,
): string[] {
  const sep = ctx.context.example_separator
    ? substituteParams(ctx.context.example_separator, { identity: ctx.identity })
    : '';
  const blocks = parseMesExamples(mesExamples, isInstruct, sep);
  if (!isInstruct) return blocks;
  return formatInstructModeExamples(blocks, ctx, ctx.identity.user, ctx.identity.char);
}
