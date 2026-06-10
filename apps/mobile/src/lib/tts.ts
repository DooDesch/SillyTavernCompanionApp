import * as Speech from 'expo-speech';

/**
 * Android's TextToSpeech rejects utterances above getMaxSpeechInputLength() (4000 chars) -
 * expo-speech THROWS in that case, so long messages must be chunked. Keep headroom below
 * the limit and prefer sentence boundaries so chunk seams stay inaudible.
 */
const CHUNK_MAX = Math.max(500, Math.min((Speech.maxSpeechInputLength ?? 4000) - 200, 3800));

/** Split text into TTS-safe chunks at sentence ends (fallback: whitespace, then hard cut). */
export function chunkForSpeech(text: string, max = CHUNK_MAX): string[] {
  const out: string[] = [];
  let rest = text;
  while (rest.length > max) {
    const win = rest.slice(0, max);
    let cut = Math.max(win.lastIndexOf('. '), win.lastIndexOf('! '), win.lastIndexOf('? '), win.lastIndexOf('\n'));
    if (cut < max * 0.5) cut = win.lastIndexOf(' ');
    if (cut <= 0) cut = max;
    const piece = rest.slice(0, cut + 1).trim();
    if (piece) out.push(piece);
    rest = rest.slice(cut + 1);
  }
  const tail = rest.trim();
  if (tail) out.push(tail);
  return out;
}

/** Strip RP markup so asterisks/quotes aren't read out literally. */
export function plainForSpeech(text: string): string {
  return text
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
