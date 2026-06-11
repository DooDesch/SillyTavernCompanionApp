/**
 * AI Horde (main_api 'koboldhorde') generation, ported from desktop SillyTavern's
 * public/scripts/horde.js. The ST server stays the proxy (src/endpoints/horde.js):
 *   POST /api/horde/generate-text  -> { id }
 *   POST /api/horde/task-status    { taskId } -> AI Horde task status
 *   POST /api/horde/cancel-task    { taskId }
 * The payload params are the FULL kobold generation data (createKoboldGenerationData with
 * isHorde: true) minus the prompt, exactly like desktop's generateHorde.
 */

export const HORDE_CHECK_INTERVAL_MS = 2500;
export const HORDE_MAX_RETRIES = 480;
/** Desktop MIN_LENGTH: response-length floor that prevents Horde validation errors. */
export const HORDE_MIN_LENGTH = 16;

/** horde_settings shape (horde.js defaults). */
export interface HordeSettings {
  models: string[];
  auto_adjust_response_length: boolean;
  auto_adjust_context_length: boolean;
  trusted_workers_only: boolean;
}

export const HORDE_DEFAULT_SETTINGS: Readonly<HordeSettings> = Object.freeze({
  models: [],
  auto_adjust_response_length: true,
  auto_adjust_context_length: false,
  trusted_workers_only: false,
});

/** Backfill desktop defaults into a raw horde_settings block. */
export function normalizeHordeSettings(raw: Record<string, unknown>): HordeSettings {
  return {
    models: Array.isArray(raw['models']) ? (raw['models'] as unknown[]).map(String) : [],
    auto_adjust_response_length:
      typeof raw['auto_adjust_response_length'] === 'boolean'
        ? raw['auto_adjust_response_length']
        : HORDE_DEFAULT_SETTINGS.auto_adjust_response_length,
    auto_adjust_context_length:
      typeof raw['auto_adjust_context_length'] === 'boolean'
        ? raw['auto_adjust_context_length']
        : HORDE_DEFAULT_SETTINGS.auto_adjust_context_length,
    trusted_workers_only:
      typeof raw['trusted_workers_only'] === 'boolean'
        ? raw['trusted_workers_only']
        : HORDE_DEFAULT_SETTINGS.trusted_workers_only,
  };
}

/** /api/horde/text-models entry (aihorde.net /v2/status/models merged with metadata). */
export interface HordeModel {
  name: string;
  cluster?: string;
  count?: number;
  performance?: number;
  queued?: number;
  eta?: number;
  is_whitelisted?: boolean;
  tags?: string[];
  [key: string]: unknown;
}

/** /api/horde/text-workers entry (aihorde.net /v2/workers?type=text). */
export interface HordeWorker {
  models?: string[];
  cluster?: string;
  trusted?: boolean;
  max_context_length?: number;
  max_length?: number;
  [key: string]: unknown;
}

/**
 * Port of `adjustHordeGenerationParams` (horde.js:147-184): shrink the requested context
 * and response length to the lowest common value across the workers serving the selected
 * models. The MIN_LENGTH floor on the response length mirrors the script.js call site
 * (`maxLength = Math.max(maxLength, MIN_LENGTH)`).
 */
export function adjustHordeParams(
  workers: HordeWorker[],
  models: HordeModel[],
  settings: HordeSettings,
  maxContextLength: number,
  maxLength: number,
): { maxContextLength: number; maxLength: number } {
  let ctx = maxContextLength;
  let len = maxLength;

  const selectedModels = models.filter((m) => settings.models.includes(m.name));
  if (selectedModels.length === 0) {
    return { maxContextLength: ctx, maxLength: len };
  }

  const availableWorkers: HordeWorker[] = [];
  for (const model of selectedModels) {
    for (const worker of workers) {
      if (model.cluster === worker.cluster && worker.models?.includes(model.name)) {
        // Skip workers that are not trusted if the option is enabled.
        if (settings.trusted_workers_only && !worker.trusted) continue;
        availableWorkers.push(worker);
      }
    }
  }

  for (const worker of availableWorkers) {
    if (settings.auto_adjust_context_length && typeof worker.max_context_length === 'number') {
      ctx = Math.min(worker.max_context_length, ctx);
    }
    if (settings.auto_adjust_response_length && typeof worker.max_length === 'number') {
      len = Math.min(worker.max_length, len);
    }
  }

  if (settings.auto_adjust_response_length) len = Math.max(len, HORDE_MIN_LENGTH);
  return { maxContextLength: ctx, maxLength: len };
}

/**
 * Port of generateHorde's payload mutations (horde.js:202-219): params = the kobold
 * generation data minus the prompt, with n=1 and the four frmt flags forced false.
 */
export function createHordePayload(
  prompt: string,
  koboldData: Record<string, unknown>,
  settings: HordeSettings,
): Record<string, unknown> {
  const params: Record<string, unknown> = { ...koboldData };
  delete params['prompt'];
  params['n'] = 1;
  params['frmtadsnsp'] = false;
  params['frmtrmblln'] = false;
  params['frmtrmspch'] = false;
  params['frmttriminc'] = false;

  return {
    prompt,
    params,
    trusted_workers: settings.trusted_workers_only,
    models: settings.models,
  };
}

export type HordeFailure = 'rejected' | 'faulted' | 'impossible' | 'timeout';

/** Typed Horde generation failure (faulted / is_possible === false / timeout / rejected). */
export class HordeError extends Error {
  constructor(
    readonly code: HordeFailure,
    message?: string,
  ) {
    super(message ?? `Horde generation failed: ${code}`);
    this.name = 'HordeError';
  }
}

/** The task was cancelled because the caller's AbortSignal fired. */
export class HordeAbortError extends Error {
  constructor() {
    super('Horde request aborted');
    this.name = 'HordeAbortError';
  }
}

export interface HordePostResponse {
  ok: boolean;
  data?: unknown;
}

/**
 * Injected transport so the poll loop is testable under fake timers:
 *   post  - authenticated POST against the ST server (path, JSON body)
 *   delay - sleep; the app may wake it early (e.g. when the app returns to foreground)
 */
export interface HordeTaskDeps {
  post: (path: string, body: unknown) => Promise<HordePostResponse>;
  delay: (ms: number) => Promise<void>;
}

export interface HordeProgress {
  queuePosition: number;
  /** round(100 - position / firstPosition * 100); 0 on the first report, 100 when done. */
  percent: number;
}

export interface HordeTaskOptions {
  signal?: AbortSignal;
  onProgress?: (progress: HordeProgress) => void;
}

export interface HordeTaskResult {
  text: string;
  workerName: string;
  model: string;
}

interface HordeTaskStatus {
  faulted?: boolean;
  is_possible?: boolean;
  done?: boolean;
  generations?: Array<{ text?: string; worker_name?: string; model?: string }>;
  queue_position?: number;
}

/**
 * Port of the generateHorde submit + poll loop (horde.js:202-285): submit the payload,
 * poll task-status every 2500ms up to 480 times, report queue progress, cancel exactly
 * once when aborted. Resolves with the first generation's text/worker/model.
 */
export async function runHordeTask(
  deps: HordeTaskDeps,
  payload: Record<string, unknown>,
  opts: HordeTaskOptions = {},
): Promise<HordeTaskResult> {
  const submit = await deps.post('/api/horde/generate-text', payload);
  const submitData = (submit.data ?? {}) as { id?: unknown; error?: { message?: string } | boolean };
  if (!submit.ok) {
    throw new HordeError('rejected');
  }
  if (submitData.error) {
    const reason =
      (typeof submitData.error === 'object' && submitData.error.message) || 'Unknown error';
    throw new HordeError('rejected', `Horde generation failed: ${reason}`);
  }

  const taskId = String(submitData.id ?? '');
  let queuePositionFirst: number | null = null;

  for (let retryNumber = 0; retryNumber < HORDE_MAX_RETRIES; retryNumber++) {
    if (opts.signal?.aborted) {
      // Exactly once: we throw immediately after, so this line cannot run twice. Desktop
      // fire-and-forgets the cancel POST (horde.js:246) - a failed cancel must never mask
      // the abort, so the result (and any rejection) is deliberately ignored.
      void Promise.resolve(deps.post('/api/horde/cancel-task', { taskId })).catch(() => {});
      throw new HordeAbortError();
    }

    const statusRes = await deps.post('/api/horde/task-status', { taskId });
    if (!statusRes.ok) {
      throw new HordeError('rejected', 'Failed to get task status');
    }
    const status = (statusRes.data ?? {}) as HordeTaskStatus;

    if (status.faulted === true) {
      throw new HordeError('faulted');
    }
    if (status.is_possible === false) {
      throw new HordeError('impossible');
    }
    if (status.done && Array.isArray(status.generations) && status.generations.length) {
      opts.onProgress?.({ queuePosition: 0, percent: 100 });
      const gen = status.generations[0]!;
      return {
        text: String(gen.text ?? ''),
        workerName: String(gen.worker_name ?? ''),
        model: String(gen.model ?? ''),
      };
    } else if (!queuePositionFirst) {
      // Desktop falsy check: a first position of 0 keeps re-arming this branch (and
      // thereby avoids a division by zero below).
      queuePositionFirst = status.queue_position ?? 0;
      opts.onProgress?.({ queuePosition: status.queue_position ?? 0, percent: 0 });
    } else if ((status.queue_position ?? -1) >= 0) {
      const queuePosition = status.queue_position as number;
      const percent = Math.round(100 - (queuePosition / queuePositionFirst) * 100);
      opts.onProgress?.({ queuePosition, percent });
    }

    await deps.delay(HORDE_CHECK_INTERVAL_MS);
  }

  throw new HordeError('timeout');
}
