import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adjustHordeParams,
  createHordePayload,
  normalizeHordeSettings,
  runHordeTask,
  HordeAbortError,
  HordeError,
  HORDE_CHECK_INTERVAL_MS,
  HORDE_MAX_RETRIES,
  HORDE_MIN_LENGTH,
  type HordePostResponse,
  type HordeProgress,
  type HordeSettings,
  type HordeTaskDeps,
} from './horde';

const SETTINGS: HordeSettings = {
  models: ['Model-A'],
  auto_adjust_response_length: true,
  auto_adjust_context_length: true,
  trusted_workers_only: false,
};

describe('createHordePayload', () => {
  it('strips the prompt from params, forces the frmt flags and n=1 (desktop order)', () => {
    const koboldData = {
      prompt: 'PROMPT',
      gui_settings: false,
      max_context_length: 2048,
      max_length: 120,
      temperature: 0.7,
      streaming: false,
      can_abort: false,
      api_server: '',
    };
    const payload = createHordePayload('PROMPT', koboldData, SETTINGS);
    expect(JSON.stringify(payload)).toBe(
      JSON.stringify({
        prompt: 'PROMPT',
        params: {
          gui_settings: false,
          max_context_length: 2048,
          max_length: 120,
          temperature: 0.7,
          streaming: false,
          can_abort: false,
          api_server: '',
          n: 1,
          frmtadsnsp: false,
          frmtrmblln: false,
          frmtrmspch: false,
          frmttriminc: false,
        },
        trusted_workers: false,
        models: ['Model-A'],
      }),
    );
    // The input object must not be mutated (desktop mutates; the port copies).
    expect(koboldData.prompt).toBe('PROMPT');
  });
});

describe('adjustHordeParams', () => {
  const models = [{ name: 'Model-A', cluster: 'horde' }];
  const workers = [
    { cluster: 'horde', models: ['Model-A'], trusted: true, max_context_length: 1024, max_length: 80 },
    { cluster: 'horde', models: ['Model-A'], trusted: false, max_context_length: 2048, max_length: 8 },
    { cluster: 'other', models: ['Model-A'], trusted: true, max_context_length: 512, max_length: 4 },
    { cluster: 'horde', models: ['Model-B'], trusted: true, max_context_length: 256, max_length: 2 },
  ];

  it('takes the lowest common worker limits and floors the length at MIN_LENGTH', () => {
    const r = adjustHordeParams(workers, models, SETTINGS, 4096, 250);
    expect(r.maxContextLength).toBe(1024);
    expect(r.maxLength).toBe(HORDE_MIN_LENGTH); // untrusted worker's 8 floored to 16
  });

  it('skips untrusted workers when trusted_workers_only is set', () => {
    const r = adjustHordeParams(workers, models, { ...SETTINGS, trusted_workers_only: true }, 4096, 250);
    expect(r.maxContextLength).toBe(1024);
    expect(r.maxLength).toBe(80);
  });

  it('returns the inputs untouched when no selected model is available', () => {
    const r = adjustHordeParams(workers, models, { ...SETTINGS, models: ['Missing'] }, 4096, 250);
    expect(r).toEqual({ maxContextLength: 4096, maxLength: 250 });
  });

  it('only adjusts the dimensions whose auto flag is set', () => {
    const r = adjustHordeParams(
      workers,
      models,
      { ...SETTINGS, auto_adjust_context_length: false, auto_adjust_response_length: false },
      4096,
      250,
    );
    expect(r).toEqual({ maxContextLength: 4096, maxLength: 250 });
  });
});

describe('normalizeHordeSettings', () => {
  it('applies desktop defaults', () => {
    expect(normalizeHordeSettings({})).toEqual({
      models: [],
      auto_adjust_response_length: true,
      auto_adjust_context_length: false,
      trusted_workers_only: false,
    });
  });
});

describe('runHordeTask', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const PAYLOAD = { prompt: 'P', params: {}, trusted_workers: false, models: ['Model-A'] };

  function makeDeps(statuses: Array<Record<string, unknown>>): {
    deps: HordeTaskDeps;
    calls: Array<{ path: string; body: unknown }>;
  } {
    const calls: Array<{ path: string; body: unknown }> = [];
    let i = 0;
    const deps: HordeTaskDeps = {
      post: async (path, body): Promise<HordePostResponse> => {
        calls.push({ path, body });
        if (path === '/api/horde/generate-text') return { ok: true, data: { id: 'task-1' } };
        if (path === '/api/horde/task-status') {
          const data = statuses[Math.min(i, statuses.length - 1)];
          i++;
          return { ok: true, data };
        }
        return { ok: true, data: {} };
      },
      delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    };
    return { deps, calls };
  }

  it('polls every 2500ms, reports queue progress and resolves the first generation', async () => {
    const { deps, calls } = makeDeps([
      { queue_position: 4 },
      { queue_position: 2 },
      { queue_position: 1 },
      { done: true, generations: [{ text: 'Hello', worker_name: 'worker-7', model: 'Model-A' }] },
    ]);
    const progress: HordeProgress[] = [];
    const promise = runHordeTask(deps, PAYLOAD, { onProgress: (p) => progress.push(p) });
    const settled = promise.then((r) => r);

    await vi.advanceTimersByTimeAsync(3 * HORDE_CHECK_INTERVAL_MS);
    const result = await settled;

    expect(result).toEqual({ text: 'Hello', workerName: 'worker-7', model: 'Model-A' });
    // percent = round(100 - position / firstPosition * 100)
    expect(progress).toEqual([
      { queuePosition: 4, percent: 0 },
      { queuePosition: 2, percent: 50 },
      { queuePosition: 1, percent: 75 },
      { queuePosition: 0, percent: 100 },
    ]);
    expect(calls[0]).toEqual({ path: '/api/horde/generate-text', body: PAYLOAD });
    expect(calls.filter((c) => c.path === '/api/horde/task-status')).toHaveLength(4);
  });

  it('rejects with a typed error when the task faults', async () => {
    const { deps } = makeDeps([{ faulted: true }]);
    await expect(runHordeTask(deps, PAYLOAD)).rejects.toMatchObject({
      name: 'HordeError',
      code: 'faulted',
    });
  });

  it('rejects with a typed error when the request is impossible', async () => {
    const { deps } = makeDeps([{ is_possible: false }]);
    await expect(runHordeTask(deps, PAYLOAD)).rejects.toMatchObject({ code: 'impossible' });
  });

  it('rejects when the submit is refused', async () => {
    const deps: HordeTaskDeps = {
      post: async () => ({ ok: true, data: { error: { message: 'no kudos' } } }),
      delay: () => Promise.resolve(),
    };
    await expect(runHordeTask(deps, PAYLOAD)).rejects.toMatchObject({
      code: 'rejected',
      message: 'Horde generation failed: no kudos',
    });
  });

  it('times out after 480 polls', async () => {
    const { deps, calls } = makeDeps([{ queue_position: 1 }]);
    const promise = runHordeTask(deps, PAYLOAD);
    const assertion = expect(promise).rejects.toMatchObject({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(HORDE_MAX_RETRIES * HORDE_CHECK_INTERVAL_MS);
    await assertion;
    expect(calls.filter((c) => c.path === '/api/horde/task-status')).toHaveLength(HORDE_MAX_RETRIES);
  });

  it('cancels exactly once and throws HordeAbortError on abort', async () => {
    const { deps, calls } = makeDeps([{ queue_position: 2 }]);
    const ac = new AbortController();
    const promise = runHordeTask(deps, PAYLOAD, { signal: ac.signal });
    const assertion = expect(promise).rejects.toBeInstanceOf(HordeAbortError);

    // First status check happens immediately; abort during the first delay.
    await vi.advanceTimersByTimeAsync(0);
    ac.abort();
    await vi.advanceTimersByTimeAsync(HORDE_CHECK_INTERVAL_MS);
    await assertion;

    const cancels = calls.filter((c) => c.path === '/api/horde/cancel-task');
    expect(cancels).toHaveLength(1);
    expect(cancels[0]?.body).toEqual({ taskId: 'task-1' });
  });

  it('exposes typed error classes', () => {
    expect(new HordeError('timeout')).toBeInstanceOf(Error);
    expect(new HordeAbortError().name).toBe('HordeAbortError');
  });
});
