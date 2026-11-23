import type { DiceElement } from '../schemas'

type Highlights = DiceElement['highlights']

/** What the highlights need to know about one die of the roll. */
export interface DieInfo {
  /** Numeric value of the face that came out. Undefined for text-only faces. */
  value: number | undefined
  /** Lowest and highest numeric value among the faces of its group (null if there is none). */
  groupMin: number | null
  groupMax: number | null
}

export interface DieFlags {
  isCritical: boolean
  isFumble: boolean
  isWinner: boolean
}

/**
 * Decides which dice are critical, fumble or winner.
 * - Critical: value >= the configured value (by default, the highest face of its group).
 * - Fumble: value <= the configured value (by default, the lowest face of its group).
 * - Winner: the highest, the lowest, or all the dice that reach the difficulty.
 *   Ties: every tied die is a winner, and the user decides what to do.
 * Dice without a numeric value are never highlighted.
 */
export function computeHighlights(dice: readonly DieInfo[], highlights: Highlights): DieFlags[] {
  const numeric = dice.flatMap((die) => (die.value === undefined ? [] : [die.value]))

  let winnerTest: (value: number) => boolean = () => false
  if (highlights.winner.enabled && numeric.length > 0) {
    if (highlights.winner.mode === 'highest') {
      const best = Math.max(...numeric)
      winnerTest = (value) => value === best
    } else if (highlights.winner.mode === 'lowest') {
      const best = Math.min(...numeric)
      winnerTest = (value) => value === best
    } else if (highlights.difficulty !== undefined) {
      const target = highlights.difficulty
      winnerTest = (value) => value >= target
    }
  }

  return dice.map((die) => {
    if (die.value === undefined) return { isCritical: false, isFumble: false, isWinner: false }

    const criticalAt = highlights.critical.value ?? die.groupMax
    const fumbleAt = highlights.fumble.value ?? die.groupMin
    return {
      isCritical: highlights.critical.enabled && criticalAt !== null && die.value >= criticalAt,
      isFumble: highlights.fumble.enabled && fumbleAt !== null && die.value <= fumbleAt,
      isWinner: winnerTest(die.value),
    }
  })
}
