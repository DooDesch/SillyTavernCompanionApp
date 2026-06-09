import { describe, expect, it } from 'vitest';
import { SmoothPacer, smoothDelayMs, SMOOTH_SPEED_DEFAULT } from './smooth';

/** Manual clock so tests control time exactly. */
function makeClock(start = 1000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe('smoothDelayMs', () => {
  it('matches ST getDelay at default speed 50', () => {
    expect(smoothDelayMs('a', 50)).toBeCloseTo(20);
    expect(smoothDelayMs('.', 50)).toBeCloseTo(500);
    expect(smoothDelayMs('!', 50)).toBeCloseTo(500);
    expect(smoothDelayMs('?', 50)).toBeCloseTo(500);
    expect(smoothDelayMs(',', 50)).toBeCloseTo(250);
    expect(smoothDelayMs('\n', 50)).toBeCloseTo(250);
  });

  it('clamps the speed factor at 1 (speed 100) and scales down (speed 0)', () => {
    expect(smoothDelayMs('a', 100)).toBeCloseTo(0.4);
    expect(smoothDelayMs('a', 0)).toBeCloseTo(40);
  });

  it('returns 0 for an empty character', () => {
    expect(smoothDelayMs('', 50)).toBe(0);
  });

  it('exports the ST default speed', () => {
    expect(SMOOTH_SPEED_DEFAULT).toBe(50);
  });
});

describe('SmoothPacer', () => {
  it('reveals nothing before time advances (beyond the immediate first char)', () => {
    const clock = makeClock();
    const pacer = new SmoothPacer({ now: clock.now });
    pacer.setTarget('hello');
    // First char is due immediately; the rest is paced.
    expect(pacer.tick().revealed).toBe(1);
    expect(pacer.tick().revealed).toBe(1);
  });

  it('batch-reveals all due characters in a single tick', () => {
    const clock = makeClock();
    const pacer = new SmoothPacer({ now: clock.now });
    pacer.setTarget('abcdef');
    pacer.tick(); // reveal 'a' immediately
    clock.advance(60); // 3 chars worth at 20 ms/char
    expect(pacer.tick().revealed).toBe(4);
  });

  it('pauses on punctuation like ST', () => {
    const clock = makeClock();
    const pacer = new SmoothPacer({ now: clock.now });
    pacer.setTarget('a. b');
    pacer.tick(); // 'a' (next due +20ms)
    clock.advance(20);
    expect(pacer.tick().revealed).toBe(2); // '.' revealed → next due +500ms
    clock.advance(499);
    expect(pacer.tick().revealed).toBe(2); // still paused
    clock.advance(1);
    expect(pacer.tick().revealed).toBe(3);
  });

  it('reports nextDelayMs while pending and null when caught up', () => {
    const clock = makeClock();
    const pacer = new SmoothPacer({ now: clock.now, minTickMs: 32 });
    pacer.setTarget('ab');
    const pending = pacer.tick();
    expect(pending.nextDelayMs).not.toBeNull();
    expect(pending.nextDelayMs!).toBeGreaterThanOrEqual(20);
    clock.advance(1000);
    expect(pacer.tick().nextDelayMs).toBeNull();
  });

  it('respects minTickMs as the floor for the suggested delay', () => {
    const clock = makeClock();
    const pacer = new SmoothPacer({ now: clock.now, minTickMs: 32, speed: 100 }); // 0.4ms/char
    pacer.setTarget('abcdefgh');
    const t = pacer.tick();
    expect(t.nextDelayMs).toBe(32);
  });

  it('continues seamlessly when the target grows mid-drain', () => {
    const clock = makeClock();
    const pacer = new SmoothPacer({ now: clock.now });
    pacer.setTarget('abc');
    pacer.tick();
    clock.advance(40);
    expect(pacer.tick().revealed).toBe(3);
    pacer.setTarget('abcdef');
    clock.advance(40);
    expect(pacer.tick().revealed).toBeGreaterThanOrEqual(4);
    clock.advance(1000);
    expect(pacer.tick().revealed).toBe(6);
  });

  it('resumes pacing after being fully caught up', () => {
    const clock = makeClock();
    const pacer = new SmoothPacer({ now: clock.now });
    pacer.setTarget('ab');
    clock.advance(1000);
    expect(pacer.tick().nextDelayMs).toBeNull();
    pacer.setTarget('abcd');
    const t = pacer.tick(); // first new char due immediately
    expect(t.revealed).toBe(3);
    expect(t.nextDelayMs).not.toBeNull();
  });

  it('seed() marks the prefix as already revealed (continue mode)', () => {
    const clock = makeClock();
    const pacer = new SmoothPacer({ now: clock.now });
    pacer.seed('existing reply');
    expect(pacer.revealedLength).toBe('existing reply'.length);
    expect(pacer.tick().nextDelayMs).toBeNull();
    pacer.setTarget('existing reply and more');
    expect(pacer.revealedText).toBe('existing reply');
  });

  it('flush() reveals everything instantly and is idempotent', () => {
    const clock = makeClock();
    const pacer = new SmoothPacer({ now: clock.now });
    pacer.setTarget('hello world');
    expect(pacer.flush()).toBe(11);
    expect(pacer.flush()).toBe(11);
    expect(pacer.revealedText).toBe('hello world');
    expect(pacer.tick().nextDelayMs).toBeNull();
  });

  it('catches up faster when far behind', () => {
    const clock = makeClock();
    const behind = new SmoothPacer({ now: clock.now, catchUpThreshold: 10 });
    behind.setTarget('x'.repeat(100)); // 100 pending > threshold 10
    behind.tick();
    clock.advance(200); // 10 due-steps at 20ms → 3 chars each
    const fast = behind.tick().revealed;

    const clock2 = makeClock();
    const normal = new SmoothPacer({ now: clock2.now, catchUpThreshold: 600 });
    normal.setTarget('x'.repeat(100));
    normal.tick();
    clock2.advance(200);
    const slow = normal.tick().revealed;

    expect(fast).toBeGreaterThan(slow);
  });

  it('handles a non-append target defensively (jumps back to the common prefix)', () => {
    const clock = makeClock();
    const pacer = new SmoothPacer({ now: clock.now });
    pacer.setTarget('hello world');
    pacer.flush();
    pacer.setTarget('hello there');
    expect(pacer.revealedLength).toBe('hello '.length);
    expect(pacer.revealedText).toBe('hello ');
    clock.advance(10_000);
    expect(pacer.tick().revealed).toBe('hello there'.length);
  });
});
