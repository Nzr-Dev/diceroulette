import { counterElementSchema, timerElementSchema, wheelElementSchema } from '../schemas'
import type { CounterElement, TimerElement, WheelElement } from '../schemas'

type NewId = () => string
const defaultNewId: NewId = () => globalThis.crypto.randomUUID()

/** A wheel with the given option labels, all with weight 1. */
export function createWheel(name: string, labels: string[], newId: NewId = defaultNewId): WheelElement {
  return wheelElementSchema.parse({
    id: newId(),
    type: 'wheel',
    name,
    sectors: labels.map((label) => ({ id: newId(), label })),
  })
}

/** A counter that starts at `initial`. */
export function createCounter(name: string, initial = 0, newId: NewId = defaultNewId): CounterElement {
  return counterElementSchema.parse({ id: newId(), type: 'counter', name, value: initial, initial })
}

/** A countdown (with `seconds`) or a stopwatch (without). */
export function createTimer(name: string, seconds?: number, newId: NewId = defaultNewId): TimerElement {
  return timerElementSchema.parse({
    id: newId(),
    type: 'timer',
    name,
    mode: seconds === undefined ? 'stopwatch' : 'countdown',
    ...(seconds !== undefined && { durationSeconds: seconds }),
  })
}
