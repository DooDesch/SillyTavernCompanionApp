import type { ChatCompletionSource } from './types';

export interface ChatCompletionDelta {
  text: string;
  reasoning?: string;
  done?: boolean;
}

/**
 * Parse one SSE data payload from /api/backends/chat-completions/generate. ST forwards the NATIVE
 * provider SSE (no normalization), so parsing is per-source (openai.js getStreamingReply).
 */
export function parseChatCompletionData(data: string, source: ChatCompletionSource): ChatCompletionDelta | null {
  if (data === '[DONE]') return { text: '', done: true };

  let p: any;
  try {
    p = JSON.parse(data);
  } catch {
    return null;
  }

  // Claude (Anthropic): content_block_delta with delta.text / delta.thinking
  if (source === 'claude') {
    return { text: p?.delta?.text ?? '', reasoning: p?.delta?.thinking || undefined, done: false };
  }

  // Google Gemini / Vertex AI: candidates[0].content.parts[] (filter out "thought" parts)
  if (source === 'makersuite' || source === 'vertexai') {
    const parts = p?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.filter((x: any) => !x.thought).map((x: any) => x.text).filter(Boolean).join('');
    const reasoning = parts.filter((x: any) => x.thought).map((x: any) => x.text).filter(Boolean).join('');
    return { text, reasoning: reasoning || undefined, done: false };
  }

  // Cohere: delta.message.content.text
  if (source === 'cohere') {
    return { text: p?.delta?.message?.content?.text ?? '', done: false };
  }

  // Mistral: delta.content may be an array of { text } / { thinking: [{ text }] }
  if (source === 'mistralai') {
    const content = p?.choices?.[0]?.delta?.content;
    if (Array.isArray(content)) {
      const text = content.map((x: any) => x.text).filter(Boolean).join('');
      const reasoning = content
        .map((x: any) => x?.thinking?.[0]?.text)
        .filter(Boolean)
        .join('');
      return { text, reasoning: reasoning || undefined, done: false };
    }
    return { text: typeof content === 'string' ? content : '', done: false };
  }

  // OpenAI / OpenRouter / DeepSeek / Groq / xAI / Perplexity / custom: choices[0].delta.content
  const choice = p?.choices?.[0];
  const text = choice?.delta?.content ?? choice?.message?.content ?? choice?.text ?? '';
  const reasoning =
    choice?.delta?.reasoning_content ??
    choice?.delta?.reasoning ??
    choice?.message?.reasoning ??
    choice?.message?.reasoning_content ??
    undefined;
  return { text: typeof text === 'string' ? text : '', reasoning, done: false };
}
