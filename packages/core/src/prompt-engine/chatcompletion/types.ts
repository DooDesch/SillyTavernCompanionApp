/**
 * Chat-Completion (main_api='openai') types. The app builds an OpenAI-style messages[] array and
 * posts it to ST's /api/backends/chat-completions/generate; ST does the provider-specific
 * conversion (Claude/Gemini/etc.) with its stored API keys. Field names mirror `oai_settings`.
 */

export type ChatCompletionSource =
  | 'openai'
  | 'claude'
  | 'openrouter'
  | 'makersuite'
  | 'vertexai'
  | 'mistralai'
  | 'custom'
  | 'cohere'
  | 'perplexity'
  | 'groq'
  | 'deepseek'
  | 'xai'
  | 'ai21'
  | 'moonshot'
  | string;

/** A multimodal content part (vision). ST forwards these and converts per provider server-side. */
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  /** Plain text, or an array of content parts for multimodal (text + image_url). */
  content: string | ContentPart[];
  name?: string;
}

export interface OaiPrompt {
  identifier: string;
  name?: string;
  role?: 'system' | 'user' | 'assistant';
  content?: string;
  system_prompt?: boolean;
  marker?: boolean;
}

export interface OaiPromptOrderEntry {
  character_id: number;
  order: { identifier: string; enabled: boolean }[];
}

export interface OaiSettings {
  chat_completion_source: ChatCompletionSource;

  // Per-source model fields (only the common ones typed; rest via index signature).
  openai_model?: string;
  claude_model?: string;
  google_model?: string;
  vertexai_model?: string;
  openrouter_model?: string;
  mistralai_model?: string;
  cohere_model?: string;
  perplexity_model?: string;
  groq_model?: string;
  deepseek_model?: string;
  xai_model?: string;
  custom_model?: string;

  // Samplers
  temp_openai?: number;
  top_p_openai?: number;
  top_k_openai?: number;
  top_a_openai?: number;
  min_p_openai?: number;
  freq_pen_openai?: number;
  pres_pen_openai?: number;
  repetition_penalty_openai?: number;

  openai_max_context?: number;
  openai_max_tokens?: number;
  stream_openai?: boolean;

  prompts?: OaiPrompt[];
  prompt_order?: OaiPromptOrderEntry[];

  scenario_format?: string;
  personality_format?: string;
  new_chat_prompt?: string;
  new_example_chat_prompt?: string;
  main_prompt?: string;

  names_behavior?: number;
  squash_system_messages?: boolean;
  custom_prompt_post_processing?: string;
  reasoning_effort?: string;
  show_thoughts?: boolean;
  use_sysprompt?: boolean;
  assistant_prefill?: string;
  continue_postfix?: string;
  seed?: number;
  n?: number;

  [key: string]: unknown;
}

/** Default PromptManager order (PromptManager.js promptManagerDefaultPromptOrder). */
export const DEFAULT_PROMPT_ORDER: { identifier: string; enabled: boolean }[] = [
  { identifier: 'main', enabled: true },
  { identifier: 'worldInfoBefore', enabled: true },
  { identifier: 'personaDescription', enabled: true },
  { identifier: 'charDescription', enabled: true },
  { identifier: 'charPersonality', enabled: true },
  { identifier: 'scenario', enabled: true },
  { identifier: 'enhanceDefinitions', enabled: false },
  { identifier: 'nsfw', enabled: true },
  { identifier: 'worldInfoAfter', enabled: true },
  { identifier: 'dialogueExamples', enabled: true },
  { identifier: 'chatHistory', enabled: true },
  { identifier: 'jailbreak', enabled: true },
];

/** Identifiers handled as "markers" (content comes from character/chat/world, not the prompt entry). */
export const MARKER_IDENTIFIERS = new Set([
  'worldInfoBefore',
  'worldInfoAfter',
  'personaDescription',
  'charDescription',
  'charPersonality',
  'scenario',
  'dialogueExamples',
  'chatHistory',
]);
