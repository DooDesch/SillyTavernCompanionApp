/**
 * Markdown image syntax as showdown reads it in desktop ST: `![alt](url)`, optionally with a
 * `"title"` and with the URL wrapped in `<>`. Pure string code, no RN imports.
 */
const IMAGE_RE = /!\[([^\]]*)\]\(\s*<?([^\s)>]+)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;

export type ImagePart = { kind: 'text'; text: string } | { kind: 'image'; url: string; alt: string };

/** Split one line into text and image parts. A line without images returns one text part. */
export function splitImages(line: string): ImagePart[] {
  const parts: ImagePart[] = [];
  let last = 0;
  for (const m of line.matchAll(IMAGE_RE)) {
    const start = m.index ?? 0;
    if (start > last) parts.push({ kind: 'text', text: line.slice(last, start) });
    parts.push({ kind: 'image', url: m[2]!, alt: m[1] ?? '' });
    last = start + m[0].length;
  }
  if (last < line.length || parts.length === 0) parts.push({ kind: 'text', text: line.slice(last) });
  return parts;
}

/** True for URLs that point to another host, the ones ST's external media rule covers. */
export function isExternalUrl(url: string): boolean {
  return url.indexOf('://') > 0 || url.startsWith('//');
}
