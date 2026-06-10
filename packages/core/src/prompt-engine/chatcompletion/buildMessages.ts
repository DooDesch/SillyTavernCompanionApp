import type { CharacterCardFields } from '../characterFields';
import type { HistoryMessage, TokenCounter } from '../buildPrompt';
import type { Identity } from '../types';
import { substituteParams } from '../substituteParams';
import { parseExampleIntoIndividual, parseMesExamples } from '../examples';
import { EXTENSION_ROLE, type DepthInjection } from '../depthInject';
import {
  DEFAULT_PROMPT_ORDER,
  type ChatCompletionMessage,
  type ContentPart,
  type OaiPrompt,
  type OaiSettings,
} from './types';

const DEFAULT_CHARACTER_ID = 100000;

/** character_names_behavior: NONE=-1, DEFAULT=0, COMPLETION=1 (name field), CONTENT=2 (prefix). */
const NAMES_COMPLETION = 1;
const NAMES_CONTENT = 2;

export interface BuildMessagesInput {
  oai: OaiSettings;
  fields: CharacterCardFields;
  history: HistoryMessage[];
  worldInfoBefore?: string;
  worldInfoAfter?: string;
  /** In-chat @depth injections (WI atDepth, character depth_prompt, Author's Note, persona@depth). */
  depthInjections?: DepthInjection[];
  identity: Identity;
  maxContext: number;
  maxTokens: number;
  countTokens: TokenCounter;
  type?: 'normal' | 'continue' | 'regenerate' | 'swipe' | 'quiet';
}

/** ST default_continue_nudge_prompt (openai.js). */
const DEFAULT_CONTINUE_NUDGE = '[Continue your last message without repeating its original content.]';

const ccRole = (role: number): ChatCompletionMessage['role'] =>
  role === EXTENSION_ROLE.USER ? 'user' : role === EXTENSION_ROLE.ASSISTANT ? 'assistant' : 'system';

/** Sanitize a display name into an OpenAI `name` field (allowed: a-z A-Z 0-9 _ -). */
const sanitizeName = (name: string): string => name.replace(/[^a-zA-Z0-9_-]/g, '_');

function squashSystemMessages(messages: ChatCompletionMessage[]): ChatCompletionMessage[] {
  const out: ChatCompletionMessage[] = [];
  for (const m of messages) {
    const prev = out[out.length - 1];
    if (
      m.role === 'system' &&
      !m.name &&
      prev &&
      prev.role === 'system' &&
      !prev.name &&
      typeof prev.content === 'string' &&
      typeof m.content === 'string'
    ) {
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
        return null; // handled specially below (produces multiple messages)
      default: {
        // Custom prompt entry
        const p = promptsById.get(identifier);
        const c = subst(p?.content);
        return c ? { role: (p?.role as ChatCompletionMessage['role']) ?? 'system', content: c } : null;
      }
    }
  };

  // Example dialogues → user/assistant message pairs, each block prefixed by the new-example marker.
  const exampleMessages: ChatCompletionMessage[] = [];
  {
    const blocks = parseMesExamples(fields.mesExamples, false, '', true);
    const exSep = subst(oai.new_example_chat_prompt || '');
    for (const block of blocks) {
      const turns = parseExampleIntoIndividual(block, identity.user, identity.char);
      if (turns.length === 0) continue;
      if (exSep) exampleMessages.push({ role: 'system', content: exSep, name: 'example_assistant' });
      for (const t of turns) {
        exampleMessages.push({
          role: t.name === 'example_user' ? 'user' : 'assistant',
          content: t.content,
          name: t.name,
        });
      }
    }
  }

  const enabled = order.filter((o) => o.enabled);
  const historyIdx = enabled.findIndex((o) => o.identifier === 'chatHistory');

  const pre: ChatCompletionMessage[] = [];
  const post: ChatCompletionMessage[] = [];
  enabled.forEach((o, i) => {
    if (o.identifier === 'chatHistory') return;
    const target = historyIdx === -1 || i < historyIdx ? pre : post;
    if (o.identifier === 'dialogueExamples') {
      target.push(...exampleMessages);
      return;
    }
    const msg = resolve(o.identifier);
    if (!msg) return;
    target.push(msg);
  });

  // Budget the chat history (newest-first) with whatever remains after the system prompts.
  const budget = (input.maxContext || 8192) - (input.maxTokens || 512);
  let used = 0;
  for (const m of [...pre, ...post]) used += await countTokens(typeof m.content === 'string' ? m.content : '');

  const namesBehavior = oai.names_behavior ?? 0;
  const historyMessages: ChatCompletionMessage[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i]!;
    const tokens = await countTokens(m.mes);
    if (used + tokens > budget && historyMessages.length > 0) break;
    used += tokens;
    const name = m.name || (m.isUser ? identity.user : identity.char);
    const text = namesBehavior === NAMES_CONTENT ? `${name}: ${m.mes}` : m.mes;
    const content: string | ContentPart[] =
      m.image && m.isUser
        ? [
            { type: 'text', text },
            { type: 'image_url', image_url: { url: m.image } },
          ]
        : text;
    const msg: ChatCompletionMessage = { role: m.isUser ? 'user' : 'assistant', content };
    if (namesBehavior === NAMES_COMPLETION) msg.name = sanitizeName(name);
    historyMessages.unshift(msg);
  }

  // Continue, prefill flavor (ST): displace the partial reply BEFORE the in-chat
  // injections, so depth splices use the history without it.
  const isContinue = (input.type ?? 'normal') === 'continue';
  let continueMessage: ChatCompletionMessage | null = null;
  if (isContinue && oai.continue_prefill && historyMessages.length > 0) {
    continueMessage = historyMessages.pop()!;
  }

  // In-chat @depth injections, spliced into the history at `length - depth` (shallow→deep).
  const injectedSet = new Set<ChatCompletionMessage>();
  const injections = (input.depthInjections ?? []).filter((d) => d.content && d.content.length > 0);
  if (injections.length > 0) {
    const origLen = historyMessages.length;
    const byDepth = new Map<number, DepthInjection[]>();
    for (const inj of injections) {
      const d = Math.max(0, inj.depth);
      const arr = byDepth.get(d) ?? [];
      arr.push(inj);
      byDepth.set(d, arr);
    }
    for (const depth of [...byDepth.keys()].sort((a, b) => a - b)) {
      const segs = byDepth
        .get(depth)!
        .map((inj) => ({ role: ccRole(inj.role ?? EXTENSION_ROLE.SYSTEM), content: subst(inj.content) }));
      segs.forEach((s) => injectedSet.add(s));
      const idx = Math.max(0, Math.min(historyMessages.length, origLen - depth));
      historyMessages.splice(idx, 0, ...segs);
    }
  }

  // Continue, nudge flavor (ST populateChatHistory): displace the partial reply (the
  // last non-injected message) so it ends the request followed by the continue nudge.
  // Skipped entirely for an empty partial, like ST's `cyclePrompt &&` guard.
  const partialRaw = (history[history.length - 1]?.mes ?? '').trim();
  if (isContinue && !oai.continue_prefill && partialRaw && historyMessages.length > 0) {
    for (let i = historyMessages.length - 1; i >= 0; i--) {
      if (!injectedSet.has(historyMessages[i]!)) {
        continueMessage = historyMessages.splice(i, 1)[0]!;
        break;
      }
    }
  }

  const messages = [...pre, ...historyMessages, ...post];
  if (continueMessage) {
    if (oai.continue_prefill) {
      // Assistant prefill flavor: the partial reply is the final assistant message
      // (Claude additionally gets the configured assistant_prefill prepended).
      const supportsPrefill = oai.chat_completion_source === 'claude';
      const prefill =
        continueMessage.role === 'assistant' && supportsPrefill ? subst(oai.assistant_prefill) : '';
      if (prefill && typeof continueMessage.content === 'string') {
        const content = [prefill, continueMessage.content].filter(Boolean).join('\n\n');
        continueMessage = { ...continueMessage, content };
      }
      messages.push(continueMessage);
    } else {
      // {{lastChatMessage}} mirrors what the displaced message carries (incl. a
      // names_behavior prefix); the function replacer keeps `$` patterns inert.
      const partialText =
        typeof continueMessage.content === 'string' ? continueMessage.content : partialRaw;
      const nudge = (oai.continue_nudge_prompt || DEFAULT_CONTINUE_NUDGE).replace(
        /{{lastChatMessage}}/gi,
        () => partialText.trim(),
      );
      messages.push(continueMessage, { role: 'system', content: subst(nudge) });
    }
  }
  return oai.squash_system_messages ? squashSystemMessages(messages) : messages;
}
