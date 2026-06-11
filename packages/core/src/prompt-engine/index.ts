export * from './types';
export { substituteMacros } from './macros';
export type { EnvObject, MacroValue } from './macros';
export { substituteParams, collapseNewlines } from './substituteParams';
export type { SubstituteOptions, CardMacroValues } from './substituteParams';
export { baseChatReplace, getCharacterCardFields } from './characterFields';
export type { CharacterCardFields, ChatFieldOverrides } from './characterFields';
export { renderStoryString } from './storyString';
export type { StoryStringData } from './storyString';
export {
  formatInstructModeChat,
  formatInstructModePrompt,
  formatInstructModeStoryString,
  getInstructStoppingSequences,
  FORCE_SEQUENCE,
} from './instruct';
export type { InstructContext, ForceSequence } from './instruct';
export { getStoppingStrings } from './stoppingStrings';
export { buildTextCompletionPrompt } from './buildPrompt';
export type { BuildPromptInput, BuildPromptResult, HistoryMessage, TokenCounter } from './buildPrompt';
export { createTextgenBody, getTextgenServer } from './textgenBody';
export type { TextgenSettings, TextgenBodyOptions } from './textgenBody';
export {
  buildTextgenGenerateRequest,
  buildChatCompletionGenerateRequest,
  historyFromMessages,
  currentSwipeText,
  TEXT_COMPLETION_GENERATE_PATH,
} from './generate';
export type {
  TextgenGenerateParams,
  TextgenGenerateRequest,
  ChatCompletionGenerateParams,
  ChatCompletionGenerateRequest,
} from './generate';

// Chat completion (cloud backends)
export * from './chatcompletion/index';
export { extractEngineConfig, estimateTokens, extractPersonas, applyPersonaToConfig } from './settings';
export type { EngineConfig, Persona, PersonaList } from './settings';

// Tokenizer endpoint resolution (faithful token budgeting via the ST server tokenizers)
export { resolveTokenizer, tokenizerSlugFromModel, TOKENIZER } from './tokenizer';
export type { ResolvedTokenizer } from './tokenizer';

// Example dialogues (mes_example)
export {
  parseMesExamples,
  parseExampleIntoIndividual,
  formatInstructModeExamples,
  getExampleBlocks,
} from './examples';
export type { ExampleMessage } from './examples';

// In-chat @depth injection (WI atDepth, Author's Note, character depth_prompt, persona@depth)
export { injectAtDepth, roleFromString, EXTENSION_ROLE } from './depthInject';
export type { DepthInjection } from './depthInject';

// Connection profiles
export { extractConnectionProfiles, applyProfileToConfig } from './profiles';
export type { ConnectionProfile, ConnectionProfiles } from './profiles';

// World Info / lorebooks
export * from './worldinfo/index';
export { resolveApiSlug, normalizeMainApi, MAIN_APIS } from './apiMap';
export type { MainApi, ResolvedApiSlug } from './apiMap';
export { parsePresetArray, presetsByName } from './presetArrays';