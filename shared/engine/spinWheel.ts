import type { WheelElement } from '../schemas'
import { cryptoRng, type Rng } from './random'

export type SpinFailure = 'disabled' | 'exhausted'

export type SpinOutcome =
  | {
      ok: true
      result: NonNullable<WheelElement['lastResult']>
      /** The wheel with the result saved and, if it does not repeat, the sector marked as used. */
      element: WheelElement
      exhaustedAfter: boolean
    }
  | { ok: false; reason: SpinFailure }

export interface WheelStatus {
  /** Sectors that can still come out. Null if the wheel can repeat. */
  remaining: number | null
  exhausted: boolean
}

export function wheelStatus(wheel: WheelElement): WheelStatus {
  if (!wheel.noRepeat) return { remaining: null, exhausted: false }
  const used = new Set(wheel.usedSectorIds)
  const remaining = wheel.sectors.reduce((count, sector) => count + (used.has(sector.id) ? 0 : 1), 0)
  return { remaining, exhausted: remaining === 0 }
}

/** Puts every sector back on the wheel. */
export function resetWheel(wheel: WheelElement): WheelElement {
  return { ...wheel, usedSectorIds: [] }
}

/**
 * Spins the wheel. A sector with weight 2 comes out twice as often as one with weight 1.
 * It does not change the wheel it receives: it returns a new one.
 */
export function spinWheel(wheel: WheelElement, options: { rng?: Rng; now?: Date } = {}): SpinOutcome {
  const rng = options.rng ?? cryptoRng
  const now = options.now ?? new Date()

  if (!wheel.enabled) return { ok: false, reason: 'disabled' }
  if (wheelStatus(wheel).exhausted) return { ok: false, reason: 'exhausted' }

  const used = new Set(wheel.usedSectorIds)
  const candidates = wheel.noRepeat ? wheel.sectors.filter((sector) => !used.has(sector.id)) : wheel.sectors

  const totalWeight = candidates.reduce((sum, sector) => sum + sector.weight, 0)
  const point = rng.float() * totalWeight
  let accumulated = 0
  let chosen = candidates[candidates.length - 1]
  for (const sector of candidates) {
    accumulated += sector.weight
    if (point < accumulated) {
      chosen = sector
      break
    }
  }
  if (!chosen) throw new Error('No sectors left to spin')

  const result = { at: now.toISOString(), sectorId: chosen.id, label: chosen.label }
  const updated: WheelElement = {
    ...wheel,
    lastResult: result,
    usedSectorIds: wheel.noRepeat ? [...wheel.usedSectorIds, chosen.id] : wheel.usedSectorIds,
  }
  return { ok: true, result, element: updated, exhaustedAfter: wheelStatus(updated).exhausted }
}
