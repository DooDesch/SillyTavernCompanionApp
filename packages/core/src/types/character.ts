/**
 * SillyTavern character card shapes.
 *
 * `POST /api/characters/get` returns the full object (top-level legacy fields plus the
 * Tavern Card v2/v3 `data` block). `POST /api/characters/all` returns the same shape per entry
 * (optionally shallow). Field names mirror SillyTavern exactly so the prompt engine can read them
 * the way `getCharacterCardFields()` does in the desktop client.
 */

export interface StDepthPrompt {
  prompt: string;
  depth: number;
  role?: 'system' | 'user' | 'assistant';
}

export interface StCharacterExtensions {
  depth_prompt?: StDepthPrompt;
  talkativeness?: string;
  fav?: boolean;
  world?: string;
  [key: string]: unknown;
}

export interface StCharacterData {
  name?: string;
  description?: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  alternate_greetings?: string[];
  creator_notes?: string;
  tags?: string[];
  creator?: string;
  character_version?: string;
  extensions?: StCharacterExtensions;
  /** Embedded lorebook (character_book), shape defined later in the world-info port. */
  character_book?: unknown;
}

export interface StCharacter {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  /** Avatar filename, e.g. "Seraphina.png" — also the id used by `/api/characters/get`. */
  avatar: string;
  /** Current/most-recent chat file name for this character (no .jsonl extension). */
  chat?: string;
  create_date?: string;
  /** Timestamp (ms) of the most recent chat activity; 0 if never chatted. */
  date_last_chat?: number;
  talkativeness?: string;
  fav?: boolean;
  tags?: string[];
  data?: StCharacterData;
}
