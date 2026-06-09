import type { OaiSettings } from './types';

/** Maps the active chat_completion_source to its model field (openai.js getChatCompletionModel). */
export function getChatCompletionModel(oai: OaiSettings): string {
  const source = oai.chat_completion_source;
  const map: Record<string, string | undefined> = {
    openai: oai.openai_model,
    claude: oai.claude_model,
    makersuite: oai.google_model,
    vertexai: oai.vertexai_model,
    openrouter: oai.openrouter_model,
    mistralai: oai.mistralai_model,
    cohere: oai.cohere_model,
    perplexity: oai.perplexity_model,
    groq: oai.groq_model,
    deepseek: oai.deepseek_model,
    xai: oai.xai_model,
    custom: oai.custom_model,
  };
  // Fall back to a generic `${source}_model` lookup for sources not explicitly mapped.
  return map[source] ?? (oai[`${source}_model`] as string | undefined) ?? '';
}
