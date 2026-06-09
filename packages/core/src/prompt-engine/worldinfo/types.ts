/** World Info (lorebook) types, mirroring SillyTavern's world-file entry format. */

export const WORLD_INFO_LOGIC = { AND_ANY: 0, NOT_ALL: 1, NOT_ANY: 2, AND_ALL: 3 } as const;

export const WORLD_INFO_POSITION = {
  before: 0,
  after: 1,
  ANTop: 2,
  ANBottom: 3,
  atDepth: 4,
  EMTop: 5,
  EMBottom: 6,
  outlet: 7,
} as const;

export interface WorldInfoEntry {
  uid?: number | string;
  /** Primary keys (plaintext or /regex/). */
  key: string[];
  /** Secondary keys for selective activation. */
  keysecondary?: string[];
  content: string;
  comment?: string;
  constant?: boolean;
  selective?: boolean;
  selectiveLogic?: number;
  order?: number;
  position?: number;
  depth?: number;
  role?: number | null;
  probability?: number;
  useProbability?: boolean;
  disable?: boolean;
  /** null → use the global setting. */
  caseSensitive?: boolean | null;
  matchWholeWords?: boolean | null;
  excludeRecursion?: boolean;
  preventRecursion?: boolean;
  // Inclusion groups: at most one entry per non-empty group is injected (unless groupOverride).
  group?: string;
  groupOverride?: boolean;
  groupWeight?: number;
  useGroupScoring?: boolean | null;
  // Scan sources / scope.
  scanDepth?: number | null;
  matchPersonaDescription?: boolean;
  matchCharacterDescription?: boolean;
  // Timed effects. `delay` is stateless (chat length); sticky/cooldown need persistent state.
  delay?: number;
  sticky?: number;
  cooldown?: number;
}

export interface WorldInfoSettings {
  /** How many recent messages to scan (world_info_depth). */
  depth: number;
  /** Budget as a percentage of max context (world_info_budget). */
  budget: number;
  /** Hard token cap; 0 = derive from percentage only (world_info_budget_cap). */
  budgetCap: number;
  caseSensitive: boolean;
  matchWholeWords: boolean;
  recursive: boolean;
  maxRecursionSteps: number;
  includeNames: boolean;
  /** Minimum number of entries to activate; the scan widens until met (world_info_min_activations). */
  minActivations?: number;
  /** Cap on how deep the min-activations widening may scan (0 = unbounded). */
  maxActivationDepth?: number;
}

export const DEFAULT_WORLD_INFO_SETTINGS: WorldInfoSettings = {
  depth: 2,
  budget: 25,
  budgetCap: 0,
  caseSensitive: false,
  matchWholeWords: true,
  recursive: true,
  maxRecursionSteps: 0,
  includeNames: true,
  minActivations: 0,
  maxActivationDepth: 0,
};

/** Result of activation: content grouped by insertion position. */
export interface WorldInfoActivation {
  before: string;
  after: string;
  /** atDepth injections, each placed `depth` messages from the end of the chat. */
  depth: { depth: number; role: number | null; content: string }[];
}
