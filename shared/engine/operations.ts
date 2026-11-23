import type { Operation } from '../schemas'

export type OperationResult =
  | { ok: true; value: number }
  | { ok: false; error: 'noValues' | 'divisionByZero' }

/**
 * Combines the numeric values of a roll.
 * - sum / multiply / max / min / average: use all the values.
 * - subtract / divide: start with the first value and subtract / divide by the rest, in order.
 * Faces without a numeric value must be filtered out before calling this.
 */
export function applyOperation(operation: Operation, values: readonly number[]): OperationResult {
  const [first, ...rest] = values
  if (first === undefined) return { ok: false, error: 'noValues' }

  switch (operation) {
    case 'sum':
      return { ok: true, value: values.reduce((total, value) => total + value, 0) }
    case 'subtract':
      return { ok: true, value: rest.reduce((total, value) => total - value, first) }
    case 'multiply':
      return { ok: true, value: values.reduce((total, value) => total * value, 1) }
    case 'divide': {
      let total = first
      for (const value of rest) {
        if (value === 0) return { ok: false, error: 'divisionByZero' }
        total /= value
      }
      return { ok: true, value: total }
    }
    case 'max':
      return { ok: true, value: values.reduce((a, b) => (b > a ? b : a), first) }
    case 'min':
      return { ok: true, value: values.reduce((a, b) => (b < a ? b : a), first) }
    case 'average':
      return { ok: true, value: values.reduce((total, value) => total + value, 0) / values.length }
  }
}
