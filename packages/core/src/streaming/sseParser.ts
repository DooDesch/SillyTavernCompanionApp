/**
 * Incremental Server-Sent Events parser.
 *
 * SillyTavern streams `data: {json}\n\n` frames terminated by `data: [DONE]\n\n`
 * (see src/endpoints/backends/text-completions.js). Network chunks split at arbitrary byte
 * boundaries, so this parser buffers across `push()` calls and emits one event per blank-line
 * terminated frame. Line-based per the SSE spec; tolerates LF and CRLF.
 */
export interface SseEvent {
  data: string;
  event?: string;
}

export class SseParser {
  private buffer = '';
  private dataLines: string[] = [];
  private eventName: string | undefined;

  push(chunk: string): SseEvent[] {
    this.buffer += chunk;
    const events: SseEvent[] = [];
    let nl: number;
    while ((nl = this.buffer.indexOf('\n')) !== -1) {
      let line = this.buffer.slice(0, nl);
      this.buffer = this.buffer.slice(nl + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line === '') {
        const evt = this.finishEvent();
        if (evt) events.push(evt);
      } else {
        this.consumeLine(line);
      }
    }
    return events;
  }

  /** Emit any event still buffered without a trailing blank line (stream ended abruptly). */
  flush(): SseEvent[] {
    if (this.buffer.length > 0) {
      let line = this.buffer;
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line !== '') this.consumeLine(line);
      this.buffer = '';
    }
    const evt = this.finishEvent();
    return evt ? [evt] : [];
  }

  private consumeLine(line: string): void {
    if (line.startsWith(':')) return; // comment
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'data') this.dataLines.push(value);
    else if (field === 'event') this.eventName = value;
  }

  private finishEvent(): SseEvent | undefined {
    if (this.dataLines.length === 0 && this.eventName === undefined) return undefined;
    const evt: SseEvent = { data: this.dataLines.join('\n') };
    if (this.eventName !== undefined) evt.event = this.eventName;
    this.dataLines = [];
    this.eventName = undefined;
    return evt;
  }
}
