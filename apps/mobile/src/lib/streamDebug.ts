/**
 * Dev-only streaming instrumentation: distinguishes "SSE events arrive in bursts"
 * (transport/backend buffering) from "events arrive steadily but render too slowly"
 * (UI bottleneck). Marks are buffered and dumped as ONE log line at stream end -
 * a per-event console.log would itself cause jank and falsify the measurement.
 */
const events: { t: number; kind: 'sse' | 'render'; len: number }[] = [];

export const streamDebug = {
  mark(kind: 'sse' | 'render', len: number): void {
    if (__DEV__) events.push({ t: Math.round(performance.now()), kind, len });
  },
  dump(label: string): void {
    if (!__DEV__ || events.length === 0) return;
    const first = events[0]!.t;
    const compact = events.map((e) => `${e.kind === 'sse' ? 's' : 'r'}@${e.t - first}:${e.len}`).join(' ');
    // eslint-disable-next-line no-console
    console.log(`[stream:${label}] ${events.length} marks - ${compact}`);
    events.length = 0;
  },
};
