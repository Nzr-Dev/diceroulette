/**
 * Limits shared by the app and the server.
 * Everything that validates a table (import, save, sync) reads them from here,
 * so changing a number is a one-line edit.
 */
export const LIMITS = {
  /** Cloud: maximum size of one table (serialized JSON, in bytes). */
  maxTableBytes: 1_000_000,
  /** Cloud: maximum total size per account (in bytes). */
  maxAccountBytes: 25_000_000,

  /** Maximum number of elements in one table. */
  maxElementsPerTable: 500,
  /** Maximum number of dice groups (for example 1d20 + 2d6 = 2 groups) in one dice element. */
  maxGroupsPerElement: 20,
  /** Maximum number of dice in one group. */
  maxDicePerGroup: 1000,
  /** Maximum number of faces of one die. */
  maxFacesPerDie: 1000,
  /** Maximum number of sectors of one wheel. */
  maxSectorsPerWheel: 500,
  /** Maximum number of fixed modifiers in one dice element. */
  maxModifiersPerElement: 50,
  /** Maximum number of alerts in one counter. */
  maxAlertsPerCounter: 50,

  /** Maximum length of names and labels. */
  maxNameLength: 100,
  /** Maximum length of an icon name. */
  maxIconLength: 64,
  /** Maximum length of an emoji (some emojis use several code points). */
  maxEmojiLength: 16,

  /** Maximum duration of a timer, in seconds (24 hours). */
  maxTimerSeconds: 86_400,

  /** Local history: entries kept per table by default. */
  defaultHistoryEntries: 100,
} as const

/** Maximum number of already-drawn options an exclusion list can hold. */
export const MAX_EXCLUDED_IDS = LIMITS.maxFacesPerDie * LIMITS.maxGroupsPerElement

/** Size in bytes of a value once serialized as JSON (UTF-8). */
export function jsonSizeBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length
}
