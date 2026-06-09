import type { StChatMessage } from '@st/core';

/** ST-style humanized timestamp (format isn't validated server-side; kept readable). */
export function nowSendDate(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} @${pad(d.getHours())}h${pad(d.getMinutes())}m${pad(d.getSeconds())}s`;
}

export function makeUserMessage(name: string, mes: string): StChatMessage {
  return { name, is_user: true, send_date: nowSendDate(), mes };
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
  };
}
