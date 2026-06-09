import { describe, expect, it } from 'vitest';
import { mapPool } from './pool';

describe('mapPool', () => {
  it('preserves input order in results', async () => {
    const out = await mapPool([1, 2, 3, 4, 5], 2, async (n) => n * 10);
    expect(out).toEqual([10, 20, 30, 40, 50]);
  });

  it('never exceeds the concurrency limit', async () => {
    let active = 0;
    let peak = 0;
    await mapPool(Array.from({ length: 20 }, (_, i) => i), 4, async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 1));
      active -= 1;
    });
    expect(peak).toBeLessThanOrEqual(4);
  });

  it('handles an empty input', async () => {
    expect(await mapPool([], 8, async () => 1)).toEqual([]);
  });
});
