import type { CounterElement } from '../schemas'
import { normalizeZero } from './rounding'

/** Removes floating point noise: 0.1 + 0.2 becomes 0.3. */
function cleanFloat(value: number): number {
  return Number(value.toFixed(10))
}

/** Sets the value, keeping it inside the minimum, the maximum and the counter's own rules. */
export function setCounterValue(counter: CounterElement, value: number): CounterElement {
  let next = cleanFloat(value)
  if (!counter.allowDecimals) next = Math.round(next)

  const floor = Math.max(counter.min ?? -Infinity, counter.allowNegative ? -Infinity : 0)
  const ceiling = counter.max ?? Infinity
  next = Math.min(Math.max(next, floor), ceiling)

  return { ...counter, value: normalizeZero(next) }
}

/** Adds (direction 1) or subtracts (direction -1) one step. The multiplier is for long presses. */
export function stepCounter(counter: CounterElement, direction: 1 | -1, multiplier = 1): CounterElement {
  return setCounterValue(counter, counter.value + direction * counter.step * multiplier)
}

/** Goes back to the initial value. */
export function resetCounter(counter: CounterElement): CounterElement {
  return setCounterValue(counter, counter.initial)
}

/** Alerts whose value is the counter's current value, for example the alert for 0. */
export function reachedAlerts(counter: CounterElement): CounterElement['alerts'] {
  return counter.alerts.filter((alert) => alert.value === counter.value)
}
