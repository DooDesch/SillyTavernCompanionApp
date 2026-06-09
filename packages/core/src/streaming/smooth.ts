/**
 * Smooth-streaming pacer — a faithful port of SillyTavern's smooth streaming
 * (`public/scripts/sse-stream.js`): incoming SSE events are re-revealed character
 * by character with a per-character delay, so the UI streams word-by-word even
 * when the backend delivers large batches.
 *
 * Platform-independent by design: no timers live here. The caller injects a clock
 * (`now`) and drives `tick()` from its own scheduler; `tick()` reveals every
 * character that has become "due" since the last call (batch reveal), so a slow
 * caller never changes the perceived speed — only the granularity of updates.
 */

/**
 * Per-character delay, identical to ST's `getDelay` (sse-stream.js):
 * speed 50 → 20 ms/char, 500 ms after `.` `!` `?`, 250 ms after `,` and newline.
 * @param prevChar the character that was just revealed ('' → 0)
 * @param speed ST's `power_user.smooth_streaming_speed`, 0..100 (default 50)
 */
export function smoothDelayMs(prevChar: string, speed: number): number {
  if (!prevChar) return 0;
  const speedFactor = Math.max(100 - speed, 1);
  const defaultDelayMs = speedFactor * 0.4;
  const punctuationDelayMs = defaultDelayMs * 25;
  if (prevChar === ',' || prevChar === '\n') return punctuationDelayMs / 2;
  if (prevChar === '.' || prevChar === '!' || prevChar === '?') return punctuationDelayMs;
  return defaultDelayMs;
}

/** ST's default `power_user.smooth_streaming_speed`. */
export const SMOOTH_SPEED_DEFAULT = 50;

/** Result of a `tick()`: how much is revealed and when to call again. */
export interface PacerTick {
  /** Characters of the target currently revealed. */
  revealed: number;
  /** Suggested delay until the next tick, or `null` when fully caught up. */
  nextDelayMs: number | null;
}

export interface SmoothPacerOptions {
  /** 0..100, ST semantics (default {@link SMOOTH_SPEED_DEFAULT}). */
  speed?: number;
  /** Lower bound for `nextDelayMs` so callers cap their wake-up rate (default 32 ms ≈ 30 fps). */
  minTickMs?: number;
  /** Pending-character threshold beyond which the pacer reveals faster to catch up (default 600). */
  catchUpThreshold?: number;
  /** Clock; injectable for tests (default `Date.now`). */
  now?: () => number;
}

/**
 * Character-reveal queue. `setTarget()` grows the target text (always the FULL
 * accumulated text), `tick()` reveals all due characters. The pacer never owns
 * the source of truth: callers keep the raw network text and only use
 * `revealedLength` to slice what is visible.
 */
export class SmoothPacer {
  private readonly speed: number;
  private readonly minTickMs: number;
  private readonly catchUpThreshold: number;
  private readonly now: () => number;
  private target = '';
  private revealed = 0;
  /** Timestamp at which the next character becomes due; null until first setTarget. */
  private nextRevealAt: number | null = null;

  constructor(opts: SmoothPacerOptions = {}) {
    this.speed = opts.speed ?? SMOOTH_SPEED_DEFAULT;
    this.minTickMs = opts.minTickMs ?? 32;
    this.catchUpThreshold = opts.catchUpThreshold ?? 600;
    this.now = opts.now ?? Date.now;
  }

  /** Set target AND mark it already revealed (continue-mode prefix: no re-animation). */
  seed(text: string): void {
    this.target = text;
    this.revealed = text.length;
    this.nextRevealAt = null;
  }

  /**
   * Grow the target (callers pass the full accumulated text each event).
   * A non-append target (defensive; should not happen mid-stream) resets the
   * reveal window to the common prefix so we never show stale characters.
   */
  setTarget(text: string): void {
    if (!text.startsWith(this.target)) {
      let common = 0;
      const max = Math.min(text.length, this.target.length);
      while (common < max && text[common] === this.target[common]) common++;
      this.revealed = Math.min(this.revealed, common);
    }
    this.target = text;
    if (this.nextRevealAt === null && this.revealed < this.target.length) {
      // First pending character is due immediately; pacing starts after it.
      this.nextRevealAt = this.now();
    }
  }

  /** Reveal every character that became due since the last tick (batch reveal). */
  tick(): PacerTick {
    const now = this.now();
    if (this.nextRevealAt !== null) {
      // Far behind the model → reveal multiple chars per due-step so the
      // animation can never lag unboundedly. 1 char normally, 3 when behind.
      const step = this.pendingCount > this.catchUpThreshold ? 3 : 1;
      while (this.nextRevealAt <= now && this.revealed < this.target.length) {
        const upto = Math.min(this.revealed + step, this.target.length);
        let delay = 0;
        while (this.revealed < upto) {
          this.revealed++;
          delay = smoothDelayMs(this.target[this.revealed - 1]!, this.speed);
        }
        this.nextRevealAt += delay;
      }
      if (this.revealed >= this.target.length) this.nextRevealAt = null;
    }
    const nextDelayMs =
      this.nextRevealAt === null ? null : Math.max(this.nextRevealAt - now, this.minTickMs);
    return { revealed: this.revealed, nextDelayMs };
  }

  /** Reveal everything instantly (stream end / abort). Idempotent. */
  flush(): number {
    this.revealed = this.target.length;
    this.nextRevealAt = null;
    return this.revealed;
  }

  get revealedLength(): number {
    return this.revealed;
  }

  get pendingCount(): number {
    return this.target.length - this.revealed;
  }

  get targetText(): string {
    return this.target;
  }

  /** The currently visible slice of the target. */
  get revealedText(): string {
    return this.target.slice(0, this.revealed);
  }
}
