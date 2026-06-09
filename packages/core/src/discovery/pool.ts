/**
 * Run `fn` over `items` with at most `concurrency` in flight at once. Results keep input order.
 * Used by the subnet scanner to probe up to ~254 hosts without opening 254 sockets at once
 * (which overwhelms weak Wi-Fi NICs/routers).
 */
export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      const i = next;
      next += 1;
      if (i >= items.length) break;
      results[i] = await fn(items[i]!, i);
    }
  };

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
