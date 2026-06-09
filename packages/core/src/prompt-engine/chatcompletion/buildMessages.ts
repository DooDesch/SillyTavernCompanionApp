import type { CharacterCardFields } from '../characterFields';
import type { HistoryMessage, TokenCounter } from '../buildPrompt';
import type { Identity } from '../types';
import { substituteParams } from '../substituteParams';
import {
  DEFAULT_PROMPT_ORDER,
  type ChatCompletionMessage,
  type OaiPrompt,
  type OaiSettings,
} from './types';

const DEFAULT_CHARACTER_ID = 100000;

export interface BuildMessagesInput {
  oai: OaiSettings;
  fields: CharacterCardFields;
  history: HistoryMessage[];
  worldInfoBefore?: string;
  worldInfoAfter?: string;
  identity: Identity;
  maxContext: number;
  maxTokens: number;
  countTokens: TokenCounter;
}

function squashSystemMessages(messages: ChatCompletionMessage[]): ChatCompletionMessage[] {
  const out: ChatCompletionMessage[] = [];
  for (const m of messages) {
    const prev = out[out.length - 1];
    if (m.role === 'system' && !m.name && prev && prev.role === 'system' && !prev.name) {
      prev.content = `${prev.content}\n${m.content}`;
    } else {
      out.push({ ...m });
    }
  }
  return out;
}

/** Build the OpenAI-style messages[] following the user's prompt order (PromptManager). */
export async function buildChatCompletionMessages(input: BuildMessagesInput): Promise<ChatCompletionMessage[]> {
  const { oai, fields, identity, history, countTokens } = input;
  const card = {
    description: fields.description,
    personality: fields.personality,
    scenario: fields.scenario,
    persona: fields.persona,
    mesExamples: fields.mesExamples,
  };
  const subst = (s: string | undefined): string =>
    s ? substituteParams(s, { identity, card }) : '';

  const promptsById = new Map<string, OaiPrompt>(
    (oai.prompts ?? []).map((p) => [p.identifier, p]),
  );
  const order =
    oai.prompt_order?.find((po) => po.character_id === DEFAULT_CHARACTER_ID)?.order ??
    oai.prompt_order?.[0]?.order ??
    DEFAULT_PROMPT_ORDER;

  // Resolve a prompt identifier to a single system/role message (or null), excluding chatHistory.
  const resolve = (identifier: string): ChatCompletionMessage | null => {
    switch (identifier) {
      case 'main': {
        const content = subst(promptsById.get('main')?.content) || subst(fields.system) || subst(oai.main_prompt);
        return content ? { role: 'system', content } : null;
      }
      case 'worldInfoBefore':
        return input.worldInfoBefore ? { role: 'system', content: subst(input.worldInfoBefore) } : null;
      case 'worldInfoAfter':
        return input.worldInfoAfter ? { role: 'system', content: subst(input.worldInfoAfter) } : null;
      case 'personaDescription':
        return fields.persona ? { role: 'system', content: subst(fields.persona) } : null;
      case 'charDescription':
        return fields.description ? { role: 'system', content: subst(fields.description) } : null;
      case 'charPersonality':
        return fields.personality
          ? { role: 'system', content: subst(oai.personality_format || '{{personality}}') }
          : null;
      case 'scenario':
        return fields.scenario
          ? { role: 'system', content: subst(oai.scenario_format || '{{scenario}}') }
          : null;
      case 'nsfw': {
        const c = subst(promptsById.get('nsfw')?.content);
        return c ? { role: 'system', content: c } : null;
      }
      case 'enhanceDefinitions': {
        const c = subst(promptsById.get('enhanceDefinitions')?.content);
        return c ? { role: 'system', content: c } : null;
      }
      case 'jailbreak': {
        const c = subst(promptsById.get('jailbreak')?.content) || subst(fields.jailbreak);
        return c ? { role: 'system', content: c } : null;
      }
      case 'dialogueExamples':
        return null; // deferred (parity gap, like the text-completion path)
      default: {
        // Custom prompt entry
        const p = promptsById.get(identifier);
        const c = subst(p?.content);
        return c ? { role: (p?.role as ChatCompletionMessage['role']) ?? 'system', content: c } : null;
      }
    }
  };

  const enabled = order.filter((o) => o.enabled);
  const historyIdx = enabled.findIndex((o) => o.identifier === 'chatHistory');

  const pre: ChatCompletionMessage[] = [];
  const post: ChatCompletionMessage[] = [];
  enabled.forEach((o, i) => {
    if (o.identifier === 'chatHistory') return;
    const msg = resolve(o.identifier);
    if (!msg) return;
    (historyIdx === -1 || i < historyIdx ? pre : post).push(msg);
  });

  // Budget the chat history (newest-first) with whatever remains after the system prompts.
  const budget = (input.maxContext || 8192) - (input.maxTokens || 512);
  let used = 0;
  for (const m of [...pre, ...post]) used += await countTokens(m.content);

  const historyMessages: ChatCompletionMessage[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i]!;
    const tokens = await countTokens(m.mes);
    if (used + tokens > budget && historyMessages.length > 0) break;
    used += tokens;
    historyMessages.unshift({ role: m.isUser ? 'user' : 'assistant', content: m.mes });
  }

  const messages = [...pre, ...historyMessages, ...post];
  return oai.squash_system_messages ? squashSystemMessages(messages) : messages;
}
