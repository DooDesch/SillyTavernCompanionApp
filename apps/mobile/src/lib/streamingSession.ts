import { AppState } from 'react-native';
import { SmoothPacer, SMOOTH_SPEED_DEFAULT } from '@st/core';

/**
 * Render-layer streaming state, deliberately OUTSIDE the React tree (and outside zustand):
 * the chat screen's `messages` array stays untouched while tokens stream in, and only the
 * single `StreamingBubbleContent` subscriber re-renders per update. This is what makes
 * word-by-word streaming possible on slow devices - updating the messages array per SSE
 * event re-rendered the whole FlashList and saturated the JS thread.
 *
 * Pacing (ST's "smooth streaming") is purely visual: the network loop always owns the full
 * accumulated text, and `end()`/`flushNow()` guarantee the snapshot carries the complete
 * text before generation finalizes. A singleton is safe - the chat screen's `streaming`
 * flag already serializes generations.
 */
export interface StreamSnapshot {
  active: boolean;
  text: string;
  reasoning: string;
}

/** Cap for the post-stream animation tail so finalize never waits long on a chunky last event. */
const DRAIN_TAIL_MAX_MS = 500;
/** Update cadence when smooth streaming is off: still throttle so per-event bursts can't thrash. */
const PLAIN_THROTTLE_MS = 50;

const IDLE: StreamSnapshot = { active: false, text: '', reasoning: '' };

let snapshot: StreamSnapshot = IDLE;
const listeners = new Set<() => void>();

let pacer: SmoothPacer | null = null;
let latestText = '';
let latestReasoning = '';
let timer: ReturnType<typeof setTimeout> | null = null;
let throttleTimer: ReturnType<typeof setTimeout> | null = null;
let upstreamDone = false;
let drainResolve: (() => void) | null = null;
let drainTimeout: ReturnType<typeof setTimeout> | null = null;

function emit(text: string, reasoning: string, active = true): void {
  if (snapshot.active === active && snapshot.text === text && snapshot.reasoning === reasoning) return;
  snapshot = { active, text, reasoning };
  for (const fn of listeners) fn();
}

function clearTimers(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  if (throttleTimer) clearTimeout(throttleTimer);
  throttleTimer = null;
}

function finishDrain(): void {
  if (drainTimeout) clearTimeout(drainTimeout);
  drainTimeout = null;
  drainResolve?.();
  drainResolve = null;
}

function loop(): void {
  timer = null;
  if (!pacer) return;
  const t = pacer.tick();
  emit(pacer.revealedText, latestReasoning);
  if (t.nextDelayMs != null) {
    timer = setTimeout(loop, t.nextDelayMs);
  } else if (upstreamDone) {
    finishDrain();
  }
}

export const streamingSession = {
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** MUST return a cached object identity (useSyncExternalStore contract). */
  getSnapshot(): StreamSnapshot {
    return snapshot;
  },

  /** Begin a session. `initialText` seeds the pacer so a continue-prefix never re-animates. */
  start(opts: { smooth: boolean; speed?: number; initialText?: string }): void {
    clearTimers();
    upstreamDone = false;
    drainResolve = null;
    latestText = opts.initialText ?? '';
    latestReasoning = '';
    pacer = opts.smooth ? new SmoothPacer({ speed: opts.speed ?? SMOOTH_SPEED_DEFAULT }) : null;
    pacer?.seed(latestText);
    emit(latestText, '');
  },

  /** Called per SSE event with the FULL accumulated text + reasoning (never deltas). */
  update(text: string, reasoning: string): void {
    latestText = text;
    latestReasoning = reasoning;
    // Android throttles background timers; ST equally bypasses pacing without focus.
    const backgrounded = AppState.currentState !== 'active';
    if (pacer && !backgrounded) {
      pacer.setTarget(text);
      if (!timer) loop();
      return;
    }
    if (backgrounded) {
      pacer?.flush();
      emit(text, reasoning);
      return;
    }
    if (!throttleTimer) {
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        emit(latestText, latestReasoning);
      }, PLAIN_THROTTLE_MS);
    }
  },

  /** Natural end: let the animation drain (bounded), then ensure the full text is visible. */
  end(): Promise<void> {
    upstreamDone = true;
    if (throttleTimer) {
      clearTimeout(throttleTimer);
      throttleTimer = null;
      emit(latestText, latestReasoning);
    }
    if (!pacer || pacer.pendingCount === 0) {
      emit(latestText, latestReasoning);
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      drainResolve = resolve;
      drainTimeout = setTimeout(() => streamingSession.flushNow(), DRAIN_TAIL_MAX_MS);
      if (!timer) loop();
    });
  },

  /** Abort/error: reveal everything instantly. The snapshot always ends at the full text. */
  flushNow(): void {
    clearTimers();
    pacer?.flush();
    emit(latestText, latestReasoning);
    finishDrain();
  },

  /** Clear after the final commit so the next chat never shows stale text. */
  reset(): void {
    clearTimers();
    finishDrain();
    pacer = null;
    latestText = '';
    latestReasoning = '';
    emit('', '', false);
  },
};
