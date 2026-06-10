import type { StCharacter } from '../types/character';
import type { Identity, PowerUserSubset } from './types';
import { PROMPT_POSITION } from './types';
import { getCharacterCardFields, type CharacterCardFields, type ChatFieldOverrides } from './characterFields';
import { baseChatReplace } from './characterFields';
import { substituteParams } from './substituteParams';
import { collapseNewlines } from './substituteParams';
import { renderStoryString } from './storyString';
import {
  FORCE_SEQUENCE,
  formatInstructModeChat,
  formatInstructModePrompt,
  formatInstructModeStoryString,
  type ForceSequence,
  type InstructContext,
} from './instruct';
import { getStoppingStrings } from './stoppingStrings';
import { getExampleBlocks } from './examples';
import { EXTENSION_ROLE, injectAtDepth, roleFromString, type DepthInjection } from './depthInject';

export interface HistoryMessage {
  name: string;
  mes: string;
  isUser: boolean;
  isNarrator?: boolean;
  /** Attached image (data URL) - only used by the chat-completion (vision) path. */
  image?: string;
}

export type TokenCounter = (text: string) => number | Promise<number>;

export interface BuildPromptInput {
  character: StCharacter;
  power: PowerUserSubset;
  identity: Identity;
  /** Chronological visible messages (exclude system/hidden). */
  history: HistoryMessage[];
  /** Max prompt size in tokens (ST `this_max_context`). */
  maxContext: number;
  /** Token counter - delegate to ST `/api/tokenizers/*` in the app, or an estimate. */
  countTokens: TokenCounter;
  /** Per-chat overrides from the loaded chat's `chat_metadata` (system_prompt/scenario/mes_example). */
  chatMetadata?: ChatFieldOverrides;
  /**
   * Activated World Info: `before`/`after` go into the story string ({{wiBefore}}/{{wiAfter}});
   * `depth` entries are injected into the chat at their depth (ST `position: atDepth`).
   */
  worldInfo?: { before: string; after: string; depth?: DepthInjection[] };
  /** Author's Note injected in-chat at a depth (ST AN `position: in-chat`). */
  authorsNote?: DepthInjection;
  /** Generate as the user's next turn (instruct uses the input sequence; no example budget change). */
  isImpersonate?: boolean;
  type?: 'normal' | 'continue' | 'regenerate' | 'swipe' | 'quiet';
}

export interface BuildPromptResult {
  prompt: string;
  stoppingStrings: string[];
  /** How many history messages actually fit into the context. */
  includedMessages: number;
}

const PERSONA_IN_PROMPT = 0;
/** persona_description_positions: AT_DEPTH (inject persona into the chat at a depth). */
const PERSONA_AT_DEPTH = 2;

/** Collect all in-chat @depth injections: WI atDepth, character depth_prompt, persona@depth, AN. */
function gatherDepthInjections(
  input: BuildPromptInput,
  fields: CharacterCardFields,
  character: StCharacter,
): DepthInjection[] {
  const injections: DepthInjection[] = [];

  if (input.worldInfo?.depth) injections.push(...input.worldInfo.depth);

  if (fields.charDepthPrompt) {
    const dp = character.data?.extensions?.depth_prompt;
    injections.push({
      depth: typeof dp?.depth === 'number' ? dp.depth : 4,
      role: roleFromString(dp?.role),
      content: fields.charDepthPrompt,
    });
  }

  const power = input.power;
  if (
    fields.persona &&
    (power.persona_description_position ?? PERSONA_IN_PROMPT) === PERSONA_AT_DEPTH
  ) {
    injections.push({
      depth: typeof power.persona_description_depth === 'number' ? power.persona_description_depth : 2,
      role: power.persona_description_role ?? EXTENSION_ROLE.SYSTEM,
      content: fields.persona,
    });
  }

  if (input.authorsNote?.content) injections.push(input.authorsNote);

  // Post-history instructions (character jailbreak / post_history_instructions) go after the chat.
  if (fields.jailbreak) {
    injections.push({ depth: 0, role: EXTENSION_ROLE.SYSTEM, content: fields.jailbreak });
  }

  return injections;
}

/** Faithful port of SillyTavern's text-completion `Generate()` prompt assembly (single character). */
export async function buildTextCompletionPrompt(input: BuildPromptInput): Promise<BuildPromptResult> {
  const { character, power, identity, history, maxContext, countTokens } = input;
  const type = input.type ?? 'normal';
  const isInstruct = power.instruct.enabled;
  const collapse = power.collapse_newlines === true;

  const ctx: InstructContext = { instruct: power.instruct, context: power.context, identity, selectedGroup: false };
  const fields = getCharacterCardFields(character, power, identity, input.chatMetadata ?? {});

  // System prompt (text-completion path).
  let system = '';
  if (power.sysprompt.enabled) {
    system =
      power.prefer_character_prompt && fields.system
        ? substituteParams(fields.system, { identity, original: power.sysprompt.content ?? '' })
        : baseChatReplace(power.sysprompt.content, identity, collapse);
    if (isInstruct) system = substituteParams(system, { identity, original: power.sysprompt.content ?? '' });
  }

  const personaForStory =
    (power.persona_description_position ?? PERSONA_IN_PROMPT) === PERSONA_IN_PROMPT ? fields.persona : '';

  const storyString = renderStoryString(power.context.story_string, {
    description: fields.description,
    personality: fields.personality,
    persona: personaForStory,
    scenario: fields.scenario,
    system,
    char: identity.char,
    user: identity.user,
    wiBefore: input.worldInfo?.before ?? '',
    wiAfter: input.worldInfo?.after ?? '',
    loreBefore: input.worldInfo?.before ?? '',
    loreAfter: input.worldInfo?.after ?? '',
    anchorBefore: '',
    anchorAfter: '',
    mesExamples: '',
  });

  const combinedStoryString = isInstruct ? formatInstructModeStoryString(storyString, ctx) : storyString;

  // Format history.
  const isImpersonate = input.isImpersonate === true;
  const lastUserIndex = history.reduce((acc, m, i) => (m.isUser ? i : acc), -1);
  const formatMessage = (m: HistoryMessage, force: ForceSequence): string => {
    const name = m.isUser ? m.name : m.name || identity.char;
    if (!isInstruct) {
      return m.name && !m.isNarrator ? `${name}: ${m.mes}\n` : `${m.mes}\n`;
    }
    return formatInstructModeChat(ctx, {
      name,
      mes: m.mes,
      isUser: m.isUser,
      isNarrator: m.isNarrator === true,
      forceAvatar: false,
      forceOutputSequence: force,
    });
  };

  const lastIndex = history.length - 1;
  const formatted = history.map((m, i) => {
    let force: ForceSequence = FORCE_SEQUENCE.NONE;
    if (i === 0) force = FORCE_SEQUENCE.FIRST;
    if (i === lastUserIndex && type !== 'quiet' && !isImpersonate) force = FORCE_SEQUENCE.LAST;
    // Do not suffix the last message for continuation (ST Generate(): the partial
    // reply must end the prompt mid-turn so the model keeps writing it).
    if (i === lastIndex && type === 'continue') {
      // Something very unlikely to be in a message (ST FORMAT_TOKEN).
      const FORMAT_TOKEN = '\u0000\ufffc\u0000\ufffd';
      const s = isInstruct
        ? formatMessage({ ...m, mes: m.mes.replaceAll(FORMAT_TOKEN, '') + FORMAT_TOKEN }, FORCE_SEQUENCE.LAST)
        : formatMessage(m, force);
      return s.includes(FORMAT_TOKEN)
        ? s.slice(0, s.lastIndexOf(FORMAT_TOKEN))
        : s.slice(0, s.lastIndexOf(m.mes) + m.mes.length);
    }
    return formatMessage(m, force);
  });

  // Trailing prompt line that elicits the AI response.
  const finalLine =
    isInstruct && type !== 'continue'
      ? formatInstructModePrompt(ctx, {
          name: isImpersonate ? identity.user : identity.char,
          isImpersonate,
          promptBias: '',
        })
      : '';

  // Example dialogues (mes_example): parsed + (instruct-)formatted into block strings.
  const exampleBlocks =
    power.strip_examples || power.instruct.skip_examples === true
      ? []
      : getExampleBlocks(fields.mesExamples, isInstruct, ctx);
  const pinnedExamples = power.pin_examples && exampleBlocks.length ? exampleBlocks.join('') : '';

  // Budget: fill newest → oldest until the context is full (pinned examples reserve budget up front).
  const baseTokens = await countTokens(`${combinedStoryString}${pinnedExamples}${finalLine}`.replace(/\r/g, ''));
  let tokenCount = baseTokens;
  const included: string[] = [];
  for (let i = formatted.length - 1; i >= 0; i--) {
    const item = formatted[i]!;
    tokenCount += await countTokens(item.replace(/\r/g, ''));
    // On continue the partial reply must always reach the model (ST counts cyclePrompt
    // in its baseline and appends it unconditionally), even if it busts the budget alone.
    if (tokenCount < maxContext || (type === 'continue' && included.length === 0)) included.unshift(item);
    else break;
  }

  // Unpinned examples take whatever budget remains after the history (history has priority).
  let mesExmString = pinnedExamples;
  if (!power.pin_examples && exampleBlocks.length > 0) {
    let remaining = maxContext - tokenCount;
    const acc: string[] = [];
    for (const block of exampleBlocks) {
      const t = await countTokens(block.replace(/\r/g, ''));
      if (t > remaining) break;
      remaining -= t;
      acc.push(block);
    }
    mesExmString = acc.join('');
  }

  // Cohee's trailing-newline rule on the last in-context message.
  if (included.length > 0 && type !== 'continue') {
    if (!isInstruct || (power.instruct.wrap && type !== 'quiet')) {
      const last = included.length - 1;
      included[last] = included[last]!.replace(/\n?$/, '');
    }
  }

  // @depth injections (WI atDepth, character depth_prompt, Author's Note, persona@depth).
  const formatInject = (inj: DepthInjection): string => {
    const role = inj.role ?? EXTENSION_ROLE.SYSTEM;
    if (!isInstruct) return inj.content + '\n';
    return formatInstructModeChat(ctx, {
      name:
        role === EXTENSION_ROLE.USER
          ? identity.user
          : role === EXTENSION_ROLE.ASSISTANT
            ? identity.char
            : 'System',
      mes: inj.content,
      isUser: role === EXTENSION_ROLE.USER,
      isNarrator: role === EXTENSION_ROLE.SYSTEM,
      forceAvatar: false,
    });
  };
  let depthInjections = gatherDepthInjections(input, fields, character);
  if (type === 'continue') {
    // ST doChatInject: on continue, depth 0 behaves as depth 1 so injections land
    // BEFORE the partial reply - nothing may come between it and the model.
    depthInjections = depthInjections.map((inj) =>
      Math.max(0, inj.depth) === 0 ? { ...inj, depth: 1 } : inj,
    );
  }
  const includedCount = included.length;
  // injectAtDepth returns the input array unchanged when nothing is injected, so
  // copy before popping the cycle prompt below.
  const injected = [...injectAtDepth(included, depthInjections, formatInject)];

  // Continue: pull the (suffix-free) partial reply back out and append it after
  // everything else - ST's cyclePrompt/generatedPromptCache mechanism. Skipped for a
  // lone greeting (ST only shifts when chat2.length > 1).
  let cyclePrompt = '';
  if (type === 'continue' && includedCount > 1) {
    cyclePrompt = injected.pop() ?? '';
  }

  // mesSendString = examples + history (with @depth) + final line, with the chat_start separator.
  let mesSendString = injected.join('') + finalLine;
  if (power.context.chat_start) {
    mesSendString = substituteParams(power.context.chat_start + '\n', { identity }) + mesSendString;
  }

  let prompt = `${combinedStoryString}${mesExmString}${mesSendString}${cyclePrompt}`.replace(/\r/g, '');
  if (collapse) prompt = collapseNewlines(prompt);

  const stoppingStrings = getStoppingStrings(ctx, power, {
    isContinue: type === 'continue',
    lastMessageIsUser: history[history.length - 1]?.isUser === true,
  });

  return { prompt, stoppingStrings, includedMessages: includedCount };
}
