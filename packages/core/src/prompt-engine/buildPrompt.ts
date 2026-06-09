import type { StCharacter } from '../types/character';
import type { Identity, PowerUserSubset } from './types';
import { PROMPT_POSITION } from './types';
import { getCharacterCardFields, type ChatFieldOverrides } from './characterFields';
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

export interface HistoryMessage {
  name: string;
  mes: string;
  isUser: boolean;
  isNarrator?: boolean;
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
  /** Token counter — delegate to ST `/api/tokenizers/*` in the app, or an estimate. */
  countTokens: TokenCounter;
  /** Per-chat overrides from the loaded chat's `chat_metadata` (system_prompt/scenario/mes_example). */
  chatMetadata?: ChatFieldOverrides;
  /** Activated World Info, injected as {{wiBefore}}/{{wiAfter}} in the story string. */
  worldInfo?: { before: string; after: string };
  type?: 'normal' | 'continue' | 'regenerate' | 'swipe' | 'quiet';
}

export interface BuildPromptResult {
  prompt: string;
  stoppingStrings: string[];
  /** How many history messages actually fit into the context. */
  includedMessages: number;
}

const PERSONA_IN_PROMPT = 0;

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

  const formatted = history.map((m, i) => {
    let force: ForceSequence = FORCE_SEQUENCE.NONE;
    if (i === 0) force = FORCE_SEQUENCE.FIRST;
    if (i === lastUserIndex && type !== 'quiet') force = FORCE_SEQUENCE.LAST;
    return formatMessage(m, force);
  });

  // Trailing prompt line that elicits the AI response.
  const finalLine =
    isInstruct && type !== 'continue'
      ? formatInstructModePrompt(ctx, { name: identity.char, isImpersonate: false, promptBias: '' })
      : '';

  // Budget: fill newest → oldest until the context is full.
  const baseTokens = await countTokens(`${combinedStoryString}${finalLine}`.replace(/\r/g, ''));
  let tokenCount = baseTokens;
  const included: string[] = [];
  for (let i = formatted.length - 1; i >= 0; i--) {
    const item = formatted[i]!;
    tokenCount += await countTokens(item.replace(/\r/g, ''));
    if (tokenCount < maxContext) included.unshift(item);
    else break;
  }

  // Cohee's trailing-newline rule on the last in-context message.
  if (included.length > 0 && type !== 'continue') {
    if (!isInstruct || (power.instruct.wrap && type !== 'quiet')) {
      const last = included.length - 1;
      included[last] = included[last]!.replace(/\n?$/, '');
    }
  }

  // mesSendString = history + final line, with the chat_start separator prepended.
  let mesSendString = included.join('') + finalLine;
  if (power.context.chat_start) {
    mesSendString = substituteParams(power.context.chat_start + '\n', { identity }) + mesSendString;
  }

  let prompt = `${combinedStoryString}${mesSendString}`.replace(/\r/g, '');
  if (collapse) prompt = collapseNewlines(prompt);

  const stoppingStrings = getStoppingStrings(ctx, power, {
    isContinue: type === 'continue',
    lastMessageIsUser: history[history.length - 1]?.isUser === true,
  });

  return { prompt, stoppingStrings, includedMessages: included.length };
}
