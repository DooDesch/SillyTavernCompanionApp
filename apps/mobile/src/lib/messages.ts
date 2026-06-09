import type { StChatMessage } from '@st/core';

/** ST-style humanized timestamp (format isn't validated server-side; kept readable). */
export function nowSendDate(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} @${pad(d.getHours())}h${pad(d.getMinutes())}m${pad(d.getSeconds())}s`;
}

let seq = 0;
/** Monotonic, collision-free client id used as a stable React list key (survives delete/insert). */
export function newMessageId(): string {
  return `m${Date.now().toString(36)}_${(seq++).toString(36)}`;
}

/** Backfill stable client ids on messages loaded from the server (which have none). */
export function ensureIds(messages: StChatMessage[]): StChatMessage[] {
  return messages.map((m) => (m._cid ? m : { ...m, _cid: newMessageId() }));
}

export function makeUserMessage(name: string, mes: string): StChatMessage {
  return { name, is_user: true, send_date: nowSendDate(), mes, _cid: newMessageId() };
}

export function makeAssistantMessage(name: string, mes = ''): StChatMessage {
  return {
    name,
    is_user: false,
    send_date: nowSendDate(),
    mes,
    swipes: [mes],
    swipe_id: 0,
    gen_started: nowSendDate(),
    _cid: newMessageId(),
  };
}
