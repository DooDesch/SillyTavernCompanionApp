/**
 * Pure mutators for the persona records inside the parsed `settings.json` object
 * (desktop reference: public/scripts/personas.js). They are designed to run inside the
 * `saveSettings` read-modify-write callback and mutate only the keys they own, so a
 * concurrent desktop session never loses unrelated settings.
 *
 * Desktop shape (personas.js initPersona, ~line 515):
 *   power_user.personas:             { [avatarId]: name }
 *   power_user.persona_descriptions: { [avatarId]: { description, position, depth, role,
 *                                                    lorebook, title, connections? } }
 *   power_user.default_persona:      avatarId | null
 */

/**
 * Desktop `persona_description_positions` (personas.js:88). AFTER_CHAR is deprecated -
 * the desktop migrates it to IN_PROMPT on load and no longer offers it in the UI.
 */
export const PERSONA_POSITIONS = {
  IN_PROMPT: 0,
  /** @deprecated Desktop migrates this to IN_PROMPT. Not selectable anymore. */
  AFTER_CHAR: 1,
  TOP_AN: 2,
  BOTTOM_AN: 3,
  AT_DEPTH: 4,
  NONE: 9,
} as const;

/** The positions the desktop UI offers today (index.html #persona_description_position order). */
export const PERSONA_SELECTABLE_POSITIONS: readonly number[] = [
  PERSONA_POSITIONS.NONE,
  PERSONA_POSITIONS.IN_PROMPT,
  PERSONA_POSITIONS.TOP_AN,
  PERSONA_POSITIONS.BOTTOM_AN,
  PERSONA_POSITIONS.AT_DEPTH,
];

/** Desktop DEFAULT_DEPTH (personas.js:104). */
export const PERSONA_DEFAULT_DEPTH = 2;
/** Desktop DEFAULT_ROLE (personas.js:105) - extension_prompt_roles.SYSTEM. */
export const PERSONA_DEFAULT_ROLE = 0;

/** Editable persona fields. Only the keys that are present get written (merge, never replace). */
export interface PersonaFields {
  name?: string;
  description?: string;
  position?: number;
  depth?: number;
  role?: number;
  lorebook?: string;
  title?: string;
}

interface PersonaPowerUser {
  personas?: Record<string, string>;
  persona_descriptions?: Record<string, Record<string, unknown>>;
  default_persona?: string | null;
  [key: string]: unknown;
}

function personaPowerUser(settings: Record<string, unknown>): PersonaPowerUser {
  if (!settings.power_user || typeof settings.power_user !== 'object') settings.power_user = {};
  return settings.power_user as PersonaPowerUser;
}

/**
 * Create or update a persona. Creation uses the exact desktop default descriptor shape
 * (initPersona); updates merge ONLY the known keys from `fields`, preserving everything
 * the desktop manages on the same object (connections, lorebook, future fields).
 */
export function upsertPersona(
  settings: Record<string, unknown>,
  avatarId: string,
  fields: PersonaFields,
): void {
  const pu = personaPowerUser(settings);
  if (!pu.personas || typeof pu.personas !== 'object') pu.personas = {};
  if (!pu.persona_descriptions || typeof pu.persona_descriptions !== 'object') {
    pu.persona_descriptions = {};
  }

  if (fields.name !== undefined) {
    pu.personas[avatarId] = fields.name;
  } else if (pu.personas[avatarId] === undefined) {
    // Desktop fallback name used for nameless migrations (personas.js:264).
    pu.personas[avatarId] = '[Unnamed Persona]';
  }

  if (!pu.persona_descriptions[avatarId] || typeof pu.persona_descriptions[avatarId] !== 'object') {
    pu.persona_descriptions[avatarId] = {
      description: '',
      position: PERSONA_POSITIONS.IN_PROMPT,
      depth: PERSONA_DEFAULT_DEPTH,
      role: PERSONA_DEFAULT_ROLE,
      lorebook: '',
      title: '',
    };
  }

  const descriptor = pu.persona_descriptions[avatarId];
  if (fields.description !== undefined) descriptor.description = fields.description;
  if (fields.position !== undefined) descriptor.position = fields.position;
  if (fields.depth !== undefined) descriptor.depth = fields.depth;
  if (fields.role !== undefined) descriptor.role = fields.role;
  if (fields.lorebook !== undefined) descriptor.lorebook = fields.lorebook;
  if (fields.title !== undefined) descriptor.title = fields.title;
}

/**
 * Remove a persona from the settings (the avatar FILE is deleted separately via
 * `/api/avatars/delete`). Desktop parity (personas.js:1180-1186): removes the entries
 * from `personas` + `persona_descriptions` and leaves `default_persona = null` when the
 * deleted persona was the default.
 */
export function deletePersonaFromSettings(settings: Record<string, unknown>, avatarId: string): void {
  const pu = personaPowerUser(settings);
  if (pu.personas && typeof pu.personas === 'object') delete pu.personas[avatarId];
  if (pu.persona_descriptions && typeof pu.persona_descriptions === 'object') {
    delete pu.persona_descriptions[avatarId];
  }
  if (pu.default_persona === avatarId) pu.default_persona = null;
}

/**
 * Set (or clear with `null`) the default persona used for new chats. Desktop parity
 * (toggleDefaultPersona, personas.js:1387/1400): clearing deletes the key entirely.
 */
export function setDefaultPersona(settings: Record<string, unknown>, avatarId: string | null): void {
  const pu = personaPowerUser(settings);
  if (avatarId == null) delete pu.default_persona;
  else pu.default_persona = avatarId;
}
