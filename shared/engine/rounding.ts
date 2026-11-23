import type { z } from 'zod'
import type { numberFormatSchema } from '../schemas'

type NumberFormat = z.infer<typeof numberFormatSchema>

/**
 * Rounds a result as the user chose: integer (up or down) or decimal (1 to 4 decimals).
 * Rounding is done once, at the end, because in JavaScript 0.1 + 0.2 is 0.30000000000000004.
 * In decimal mode, halves round towards +infinity (2.5 -> 3, -2.5 -> -2).
 */
export function roundResult(value: number, format: NumberFormat): number {
  if (format.mode === 'integer') {
    return normalizeZero(format.rounding === 'up' ? Math.ceil(value) : Math.floor(value))
  }
  const factor = 10 ** format.decimals
  return normalizeZero(Math.round((value + Number.EPSILON) * factor) / factor)
}

/** Avoids -0, which would be shown as «-0». */
export function normalizeZero(value: number): number {
  return value === 0 ? 0 : value
}
