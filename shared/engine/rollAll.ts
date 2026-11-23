import type { Element } from '../schemas'
import type { Rng } from './random'
import { rollDice, type RollOutcome } from './rollDice'
import { spinWheel, type SpinOutcome } from './spinWheel'

type Success<T> = Extract<T, { ok: true }>

export type RollAllEntry =
  | { elementId: string; type: 'dice'; outcome: Success<RollOutcome> }
  | { elementId: string; type: 'wheel'; outcome: Success<SpinOutcome> }

export interface RollAllResult {
  /** All the elements of the table, in the same order, with the rolled ones updated. */
  elements: Element[]
  /** Elements that were rolled. */
  rolled: RollAllEntry[]
  /** Dice and wheels that did not roll: disabled, or with no options left (exclusion). */
  skipped: { elementId: string; reason: 'disabled' | 'exhausted' }[]
}

/**
 * «Roll all»: rolls every enabled dice element and spins every enabled wheel.
 * Counters and timers are not rolled. Disabled elements are skipped.
 */
export function rollAll(elements: readonly Element[], options: { rng?: Rng; now?: Date } = {}): RollAllResult {
  const next: Element[] = []
  const rolled: RollAllEntry[] = []
  const skipped: RollAllResult['skipped'] = []

  for (const element of elements) {
    if (element.type === 'dice') {
      const outcome = rollDice(element, options)
      if (outcome.ok) {
        next.push(outcome.element)
        rolled.push({ elementId: element.id, type: 'dice', outcome })
      } else {
        next.push(element)
        skipped.push({ elementId: element.id, reason: outcome.reason })
      }
    } else if (element.type === 'wheel') {
      const outcome = spinWheel(element, options)
      if (outcome.ok) {
        next.push(outcome.element)
        rolled.push({ elementId: element.id, type: 'wheel', outcome })
      } else {
        next.push(element)
        skipped.push({ elementId: element.id, reason: outcome.reason })
      }
    } else {
      next.push(element)
    }
  }

  return { elements: next, rolled, skipped }
}
