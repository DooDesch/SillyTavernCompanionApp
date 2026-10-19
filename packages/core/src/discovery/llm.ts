import type { StClient } from '../connection/StClient';
import { getTextCompletionStatus, type BackendStatus } from '../connection/endpoints';

/** A text-completion backend: ST textgen type plus its base URL. */
export interface LlmEndpoint {
  type: string;
  url: string;
}

/** A backend that answered, with the models it lists (empty when it lists none). */
export interface FoundLlm extends LlmEndpoint {
  models: string[];
}

/**
 * Default addresses of the local LLM servers, as seen from the SillyTavern server. Most users run
 * the LLM on the same PC as SillyTavern, and Ollama only listens on 127.0.0.1 by default, so the
 * phone cannot reach it directly. Tabby and Text Generation WebUI share port 5000; Tabby comes first
 * because only Tabby answers /v1/model/list, and the first hit per URL wins.
 */
export const LOCAL_LLM_CANDIDATES: readonly LlmEndpoint[] = [
  { type: 'koboldcpp', url: 'http://127.0.0.1:5001' },
  { type: 'ollama', url: 'http://127.0.0.1:11434' },
  { type: 'llamacpp', url: 'http://127.0.0.1:8080' },
  { type: 'generic', url: 'http://127.0.0.1:1234' },
  { type: 'tabby', url: 'http://127.0.0.1:5000' },
  { type: 'ooba', url: 'http://127.0.0.1:5000' },
  { type: 'vllm', url: 'http://127.0.0.1:8000' },
  { type: 'aphrodite', url: 'http://127.0.0.1:2242' },
];

/**
 * Probe list for a detect run: backends found in earlier runs first (they may sit on a LAN host or
 * a non-default port), then the defaults. One entry per type and URL.
 */
export function mergeLlmCandidates(
  remembered: readonly LlmEndpoint[],
  defaults: readonly LlmEndpoint[] = LOCAL_LLM_CANDIDATES,
): LlmEndpoint[] {
  const seen = new Set<string>();
  const out: LlmEndpoint[] = [];
  for (const c of [...remembered, ...defaults]) {
    const key = `${c.type}|${c.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type: c.type, url: c.url });
  }
  return out;
}

/** Product names of the textgen types, as SillyTavern labels them. Not translated. */
export const TEXTGEN_TYPE_LABELS: Record<string, string> = {
  koboldcpp: 'KoboldCpp',
  ollama: 'Ollama',
  llamacpp: 'llama.cpp',
  generic: 'Generic (LM Studio)',
  tabby: 'TabbyAPI',
  ooba: 'Text Generation WebUI',
  vllm: 'vLLM',
  aphrodite: 'Aphrodite',
};

export function textgenTypeLabel(type: string): string {
  return TEXTGEN_TYPE_LABELS[type] ?? type;
}

/**
 * Upper bound per probe. A closed local port fails at once and a live backend answers well below
 * this, but a remembered LAN host that is gone makes the server wait for the TCP timeout (~21 s).
 */
export const LLM_PROBE_TIMEOUT_MS = 4000;

async function probeWithTimeout(client: StClient, c: LlmEndpoint, timeoutMs: number): Promise<BackendStatus> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<BackendStatus>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve({ connected: false });
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      getTextCompletionStatus(client, { apiServer: c.url, apiType: c.type, signal: controller.signal }),
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Ask the SillyTavern server which of the given backends answer, through the same status route
 * desktop uses for "Connect". All probes run in parallel, each capped at `timeoutMs`. Results keep
 * the candidate order, one per URL.
 */
export async function detectLlmsViaServer(
  client: StClient,
  candidates: readonly LlmEndpoint[] = LOCAL_LLM_CANDIDATES,
  timeoutMs: number = LLM_PROBE_TIMEOUT_MS,
): Promise<FoundLlm[]> {
  const statuses = await Promise.all(candidates.map((c) => probeWithTimeout(client, c, timeoutMs)));
  const found: FoundLlm[] = [];
  const seenUrls = new Set<string>();
  candidates.forEach((c, i) => {
    const status = statuses[i];
    if (!status?.connected || seenUrls.has(c.url)) return;
    seenUrls.add(c.url);
    const models = status.models ?? (status.model ? [status.model] : []);
    found.push({ type: c.type, url: c.url, models });
  });
  return found;
}
