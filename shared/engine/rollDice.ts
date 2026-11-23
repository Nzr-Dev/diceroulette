import type { DiceElement, LastRoll, RolledDie } from '../schemas'
import { cryptoRng, type Rng } from './random'
import { applyOperation } from './operations'
import { roundResult } from './rounding'
import { computeHighlights, type DieInfo } from './highlights'
import { exclusionStatus } from './exclusion'

export type RollFailure = 'disabled' | 'exhausted'

export type RollOutcome =
  | {
      ok: true
      /** The roll, ready to be shown and added to the history. */
      roll: LastRoll
      /** The element with the roll saved as `lastRoll` and the exclusion list updated. */
      element: DiceElement
      /** True when exclusion is on and the next roll will not be possible until a reset. */
      exhaustedAfter: boolean
    }
  | { ok: false; reason: RollFailure }

export interface RollOptions {
  rng?: Rng
  now?: Date
}

/**
 * Rolls one dice element. It does not change the element it receives: it returns a new one.
 * The result is decided here, at the moment of the roll. The animation only shows it.
 */
export function rollDice(element: DiceElement, options: RollOptions = {}): RollOutcome {
  const rng = options.rng ?? cryptoRng
  const now = options.now ?? new Date()

  if (!element.enabled) return { ok: false, reason: 'disabled' }
  const useExclusion = element.exclusion.enabled
  if (useExclusion && exclusionStatus(element).exhausted) return { ok: false, reason: 'exhausted' }

  const used = new Set(element.exclusion.usedFaceIds)
  const results: RolledDie[] = []
  const infos: DieInfo[] = []

  for (const group of element.groups) {
    const numeric = group.faces.flatMap((face) => (face.value === undefined ? [] : [face.value]))
    const groupMin = numeric.length > 0 ? Math.min(...numeric) : null
    const groupMax = numeric.length > 0 ? Math.max(...numeric) : null

    // With exclusion, the dice of the group are drawn from the faces that are still in the bag.
    const pool = useExclusion ? group.faces.filter((face) => !used.has(face.id)) : group.faces

    for (let i = 0; i < group.count; i++) {
      const index = rng.int(pool.length)
      const face = pool[index]
      if (!face) throw new Error('No faces left to roll')
      if (useExclusion) {
        used.add(face.id)
        pool.splice(index, 1)
      }
      results.push({
        groupId: group.id,
        faceId: face.id,
        label: face.label,
        ...(face.value !== undefined && { value: face.value }),
        isCritical: false,
        isFumble: false,
        isWinner: false,
      })
      infos.push({ value: face.value, groupMin, groupMax })
    }
  }

  const flags = computeHighlights(infos, element.highlights)
  const flagged = results.map((die, i) => ({ ...die, ...flags[i] }))

  const values = flagged.flatMap((die) => (die.value === undefined ? [] : [die.value]))
  const operated = applyOperation(element.operation, values)

  let raw: number | null = null
  let total: number | null = null
  let error: LastRoll['error']
  if (operated.ok) {
    const modifiersTotal = element.modifiers.reduce((sum, modifier) => sum + modifier.value, 0)
    raw = roundResult(operated.value, element.numberFormat)
    total = roundResult(operated.value + modifiersTotal, element.numberFormat)
  } else if (operated.error === 'divisionByZero') {
    error = 'divisionByZero'
  }

  const difficulty = element.highlights.difficulty
  const roll: LastRoll = {
    at: now.toISOString(),
    results: flagged,
    raw,
    total,
    difficultyMet: difficulty !== undefined && total !== null ? total >= difficulty : null,
    ...(error && { error }),
  }

  const updated: DiceElement = {
    ...element,
    lastRoll: roll,
    exclusion: useExclusion ? { ...element.exclusion, usedFaceIds: [...used] } : element.exclusion,
  }

  return { ok: true, roll, element: updated, exhaustedAfter: exclusionStatus(updated).exhausted }
}
